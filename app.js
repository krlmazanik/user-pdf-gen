const express = require("express");
const mysql = require("mysql");
const bodyParser = require("body-parser");
const fs = require("fs");
const PDFDocument = require("pdfkit");

const WritableBufferStream = require("./stream");

const db = mysql.createConnection({
  host: "localhost",
  user: "db_admin",
  password: "123456",
  database: "users"
});

db.connect(err => {
  if (err) {
    throw err;
  }
  console.log("MySQL connected...");
});

const app = express();
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.render("home");
});

app.post("/generate", (req, res) => {
  var name = req.body.firstName;

  db.query("SELECT * FROM user WHERE firstName=?", name, (err, rows) => {
    if (err) console.log(err);
    if (rows.length > 0) {
      var blob = rows[0].image;
      const { firstName, lastName, id, pdf } = rows[0];

      if (pdf == null) {
        var buffer = new Buffer(blob, "binary");
        var bufferBase64 = buffer.toString("base64");
        var bufferP = new Buffer(bufferBase64, "base64");

        const doc = new PDFDocument();

        let writeStream = new WritableBufferStream();
        doc.pipe(writeStream);

        doc.text(`${firstName} ${lastName}`);
        doc.image(bufferP);
        doc.end();

        writeStream.on("finish", () => {
          const pdfBlob = writeStream.toBuffer();
          let sql = "UPDATE user SET pdf = ? Where ID = ?";

          db.query(sql, [pdfBlob, id], (err, result) => {
            if (err) console.log(err);
            res.send(JSON.stringify({ pdfWasCreated: true }));
          });
        });
      } else {
        res.send(JSON.stringify({ pdfWasCreated: false }));
      }
    } else {
      res.render('errorPage', {name: name});
    }
  });
});

app.get("/getusers", (req, res) => {
  db.query("SELECT * FROM user", (err, rows) => {
    if (err) console.log(err);

    res.render("users", { data: rows });
  });
});

app.listen("3001", () => {
  console.log("Server started on port 3001");
});
