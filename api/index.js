const express = require("express");
const app = express();


app.get("/test", (req, res) => {
  res.json({ ok: test });
});


app.get("/", (req, res) => {
  res.json({ ok: Incio });
});

app.listen(3000, ()=>{
  console.log("okk")
});