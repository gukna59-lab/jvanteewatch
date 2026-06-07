import fetch from 'node-fetch';
async function test() {
  const res = await fetch("https://api.animevost.org/v1/playlist", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "id=1152"
  });
  const json = await res.json();
  console.log(json[0]);
}
test();
