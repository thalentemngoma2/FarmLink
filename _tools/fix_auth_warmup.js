const fs = require("fs");
const path = require("path");
const file = path.join(process.cwd(), "context", "AuthContext.tsx");
let s = fs.readFileSync(file, "utf8");
// Replace the warm-up block that uses .then().catch() to avoid TS typing issues.
const re =
  /\s*\/\/ Warm up DB API silently\s*[\r\n]+\s*void supabase[\s\S]*?\n\s*\.catch\(\(\) => undefined\);/m;
if (!re.test(s)) {
  console.error("Warm-up block not found");
  process.exit(1);
}
s = s.replace(
  re,
  `        // Warm up DB API silently\n        try {\n          const { error: warmUpError } = await supabase\n            .from('users')\n            .select('user_id')\n            .limit(1);\n          if (warmUpError) console.warn('Database warm-up failed', warmUpError);\n        } catch {\n          // ignore\n        }`,
);
fs.writeFileSync(file, s);
console.log("Updated warm-up block");
