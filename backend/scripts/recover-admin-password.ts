import bcrypt from "bcrypt";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { closeMongo, connectMongo, getMongoDb, withMongoTransaction } from "../src/config/mongo";
import { recordAudit } from "../src/utils/audit";

function askLine(prompt: string): Promise<string> {
  const rl = createInterface({ input: stdin, output: stdout });
  return rl.question(prompt).finally(() => rl.close());
}

function askHidden(prompt: string): Promise<string> {
  if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
    return Promise.reject(new Error("A local interactive terminal is required."));
  }

  return new Promise((resolve, reject) => {
    let value = "";
    const wasRaw = stdin.isRaw;
    let finished = false;

    const finish = (error?: Error) => {
      if (finished) return;
      finished = true;
      stdin.off("data", onData);
      stdin.setRawMode(wasRaw);
      stdin.pause();
      stdout.write("\n");
      if (error) reject(error);
      else resolve(value);
    };

    const onData = (chunk: string | Buffer) => {
      for (const character of String(chunk)) {
        if (character === "\u0003" || character === "\u0004") {
          finish(new Error("Input cancelled."));
          return;
        }
        if (character === "\r" || character === "\n") {
          finish();
          return;
        }
        if (character === "\u007f" || character === "\b") {
          const characters = Array.from(value);
          characters.pop();
          value = characters.join("");
          continue;
        }
        if (character >= " ") value += character;
      }
    };

    stdout.write(prompt);
    stdin.setEncoding("utf8");
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on("data", onData);
  });
}

async function main(): Promise<void> {
  const adminId = await askLine("Exact existing Admin id: ");
  if (!adminId || adminId !== adminId.trim()) {
    throw new Error("The Admin id must be supplied exactly, without surrounding whitespace.");
  }

  await connectMongo();
  try {
    const users = getMongoDb().collection("users");
    const targets = await users
      .find(
        { id: adminId, role: "admin", is_active: true },
        { projection: { id: 1, email: 1, full_name: 1, role: 1, is_active: 1 } }
      )
      .limit(2)
      .toArray();

    if (targets.length !== 1) {
      throw new Error("Exactly one active Admin must match the supplied id.");
    }

    const target = targets[0];
    stdout.write(`Target verified locally: ${target.full_name} <${target.email}> (admin)\n`);
    if ((await askLine("Type RECOVER to confirm this exact account: ")) !== "RECOVER") {
      throw new Error("Recovery cancelled.");
    }

    let password = "";
    let confirmation = "";
    let passwordHash = "";
    try {
      password = await askHidden("New password (input hidden): ");
      confirmation = await askHidden("Confirm new password (input hidden): ");
      if (password !== confirmation) throw new Error("Passwords did not match.");
      if (Array.from(password).length < 12) throw new Error("Password must be at least 12 characters.");
      passwordHash = await bcrypt.hash(password, 10);

      const revokedSessionCount = await withMongoTransaction(async (database, session) => {
        const transactionTargets = await database
          .collection("users")
          .find(
            { id: adminId, role: "admin", is_active: true },
            { projection: { id: 1 }, session }
          )
          .limit(2)
          .toArray();
        if (transactionTargets.length !== 1) {
          throw new Error("The active Admin target changed; transaction aborted.");
        }

        const update = await database.collection("users").updateOne(
          { id: adminId, role: "admin", is_active: true },
          { $set: { password_hash: passwordHash, updated_at: new Date() } },
          { session }
        );
        if (update.matchedCount !== 1 || update.modifiedCount !== 1) {
          throw new Error("Exactly one Admin password update was not confirmed; transaction aborted.");
        }

        const revoked = await database.collection("refresh_tokens").updateMany(
          { user_id: adminId, revoked: { $ne: true } },
          { $set: { revoked: true } },
          { session }
        );

        await recordAudit(
          {
            actorId: null,
            action: "admin_password_recovery_local",
            resource: "user",
            resourceId: adminId,
            metadata: {
              method: "one_time_local_recovery",
              refreshSessionsRevoked: revoked.modifiedCount,
            },
          },
          session
        );

        return revoked.modifiedCount;
      });

      stdout.write(`Recovery completed. Refresh sessions revoked for this account: ${revokedSessionCount}.\n`);
    } finally {
      password = "";
      confirmation = "";
      passwordHash = "";
    }
  } finally {
    await closeMongo();
  }
}

main().catch(() => {
  console.error(
    "Recovery did not complete successfully. No password, hash, token, URI, or raw database error was displayed. If failure occurred during commit, verify the target account and audit event with the database operator before retrying."
  );
  process.exitCode = 1;
});
