import fs from "fs";
import { globIterate } from "glob";

const typeDefGlob = "./src/**/*.graphql";
/** @type string[] */
const typeDefFiles = [];
for await (const file of globIterate(typeDefGlob)) {
  typeDefFiles.push(file);
}
// Concatenate all the files together
const typeDefs = await Promise.all(
  typeDefFiles.map(async (file) => {
    const content = await fs.promises.readFile(file, "utf8");
    return content;
  }),
);

await fs.promises.writeFile("schema.graphql", typeDefs.join("\n"), "utf8");
console.log("Wrote schema.graphql to local");
await fs.promises.writeFile(
  "../../apps/cli/schema.graphql",
  typeDefs.join("\n"),
  "utf8",
);
console.log("Wrote schema.graphql to cli");
await fs.promises.writeFile(
  "../../apps/www/schema.graphql",
  typeDefs.join("\n"),
  "utf8",
);
console.log("Wrote schema.graphql to www");
await fs.promises.writeFile(
  "../../apps/workers/schema.graphql",
  typeDefs.join("\n"),
  "utf8",
);
console.log("Wrote schema.graphql to workers");
