export default function (app) {
  app.post("/hooks/testhook", (req, res) => {
    console.log("Test hook received:", JSON.stringify(req.body, null, 2));
    res.json({ received: true, body: req.body });
  });
}
