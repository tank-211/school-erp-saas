import bcrypt from "bcryptjs";

async function generateHash() {
  const hash = await bcrypt.hash("admin123", 10);
  console.log("HASH:", hash);
}

generateHash();