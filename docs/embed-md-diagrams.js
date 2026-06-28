const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "demo-assets");
const mapping = [
  ["architecture.svg", "System architecture"],
  ["roles.svg", "Role-based access control"],
  ["dashboard-mockup.svg", "Dashboard UI mockup"],
  ["enrollment-model.svg", "Student and enrollment model"],
  ["grade-formula.svg", "Weighted grade formula"],
  ["import-flow.svg", "Import workflow"],
];

let md = fs.readFileSync(path.join(__dirname, "LEADERSHIP_DEMO.md"), "utf8");

for (const [file, alt] of mapping) {
  const svg = fs.readFileSync(path.join(dir, file), "utf8");
  const b64 = Buffer.from(svg).toString("base64");
  const dataUri = `data:image/svg+xml;base64,${b64}`;
  const old = `![${alt}](./demo-assets/${file})`;
  md = md.split(old).join(`<img src="${dataUri}" alt="${alt}" style="max-width:100%;height:auto;" />`);
}

fs.writeFileSync(path.join(__dirname, "LEADERSHIP_DEMO.md"), md);
console.log("Updated LEADERSHIP_DEMO.md with embedded diagram images");
