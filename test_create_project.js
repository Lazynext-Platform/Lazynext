async function run() {
  const res = await fetch("https://lazynext.com/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Test Project" })
  });
  console.log(res.status, await res.text());
}
run();
