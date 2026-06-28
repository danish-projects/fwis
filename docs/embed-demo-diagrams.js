const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "demo-assets");
const files = [
  "architecture",
  "roles",
  "grade-formula",
  "import-flow",
  "dashboard-mockup",
  "enrollment-model",
];
const svgs = {};
for (const f of files) {
  svgs[f] = fs.readFileSync(path.join(dir, f + ".svg"), "utf8").trim();
}

let html = fs.readFileSync(path.join(__dirname, "LEADERSHIP_DEMO.html"), "utf8");

html = html.replace(
  /<div class="img-wrap"([^>]*)><img src="demo-assets\/([^"]+)\.svg"[^/]*\/><\/div>/g,
  (_m, attrs, name) =>
    `<div class="img-wrap diagram"${attrs} data-diagram="${name}"></div>`
);

const inject = `<script>
(function () {
  const DIAGRAMS = ${JSON.stringify(svgs)};
  function uniqueSvg(svg, suffix) {
    return svg
      .replace(/id="([^"]+)"/g, 'id="$1-' + suffix + '"')
      .replace(/url\\(#([^)]+)\\)/g, "url(#$1-" + suffix + ")");
  }
  document.querySelectorAll("[data-diagram]").forEach(function (el, index) {
    var key = el.getAttribute("data-diagram");
    if (DIAGRAMS[key]) el.innerHTML = uniqueSvg(DIAGRAMS[key], index);
  });
})();
</script>
`;

// Remove prior embedded diagram script if re-running
html = html.replace(/\n<script>\n\(function \(\) \{\n  const DIAGRAMS = [\s\S]*?\}\);\n\}\)\(\);\n<\/script>\n/g, "\n");

html = html.replace("</body>", inject + "</body>");
html = html.replace(
  ".img-wrap img { width: 100%; height: auto; display: block; border-radius: 4px; }",
  ".img-wrap svg { width: 100%; height: auto; display: block; border-radius: 4px; max-height: 320px; }"
);

fs.writeFileSync(path.join(__dirname, "LEADERSHIP_DEMO.html"), html);
console.log("Embedded", files.length, "diagrams into LEADERSHIP_DEMO.html");
