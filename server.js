require("dotenv").config();
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const port = process.env.PORT;
const app = express();
const { v4: uuidv4 } = require("uuid");
const cors = require("cors");
app.use(express.json());
const mysql = require('mysql2');

app.use(
    cors({  
        "origin": "*",
  "methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
  "preflightContinue": false,
  "optionsSuccessStatus": 204
    })
);

const url = `mysql://${process.env.MYSQLUSER}:${process.env.MYSQLPASSWORD}@${process.env.MYSQLHOST}:${process.env.MYSQLPORT}/${process.env.MYSQLDATABASE}`

const connection = mysql.createConnection(url);

  // Connect to MySQL
connection.connect((err) => {
    if (err) {
      console.error('Error connecting to MySQL: ' + err.stack);
      return;
    }
    console.log('Connected to MySQL as id ' + connection.threadId);
    app.listen(port, () => {
        console.log("server is running... :)");
      });
    const query = `SELECT * FROM users WHERE phone = 9174996768;`;
    connection.query(query, (err, result) => {
        if (err) throw err;
        console.log(result);
    })
});


app.post("/api/signup", async (request, response) => {
    const { phone, password} = request.body;
    const checkUserQuery = `SELECT * FROM users WHERE phone = '${phone}';`;
    connection.query(checkUserQuery, async (err, result) => {
        if (err) throw err;
        else {
            if (result.length !== 0) {
                response.status(400);
                response.send("User already exists");
            }  else if (!(Number.isInteger(parseInt(phone))) && !(phone.length ===10))  {
                response.status(400);
                response.send("Invalid phone number.");
            } else if (password.length < 8) {
                response.status(400);
                response.send("Password is too short");
            } else {
                const hashPassword = await bcrypt.hash(password, 10);
                const query = `
                    INSERT INTO users (id, phone, password)
                    VALUES (
                        '${uuidv4()}',
                        '${phone}',
                        '${hashPassword}'
                    );`;
                connection.query(query, (err, result) => {
                    if (err) throw err;
                        connection.query(`SELECT * FROM users WHERE phone = '${phone}';`, (err, res) => {
                            if (err) throw err;
                            response.status(200);
                            response.send(res);
                        });
                        
                    
                })
            }
            
        }
    });
});

app.post("/login/", async (request, response) => {
    const { phone, password } = request.body;
    const checkUserQuery = `SELECT * FROM users WHERE phone = '${phone}';`;
    connection.query(checkUserQuery, async(err, result) => {
        if (err) throw err;
        else {
            if (result.length === 0) {
                response.status(400);
                response.send("Invalid user");
            } else {
                const checkPassword = await bcrypt.compare(password, result[0].password);
            
                if (checkPassword === false) {
                  response.status(400);
                  response.send("Invalid password");
                } else {
                  const payload = { phone};
                  const jwtoken = jwt.sign(payload, process.env.JWT_SECRET);
                  response.send({ jwtToken: jwtoken, user: result });
                }
            }
        }
    });  
});




app.post("/reset-password", async (request, response) => {
    const { phone, newPassword } = request.body;
    const checkUserQuery = `SELECT * FROM users WHERE phone = '${phone}';`;
    connection.query(checkUserQuery, async (err, result) => {
        if (err) throw err;
        else {
            if (result.length === 0) {
                response.status(400);
                response.send("User not found");
            } else if (newPassword.length < 8) {
                response.status(400);
                response.send("Password is too short");
            } else {
                const hashPassword = await bcrypt.hash(newPassword, 10);
                const updateQuery = `
                    UPDATE users
                    SET password = '${hashPassword}'
                    WHERE phone = '${phone}';
                `;
                connection.query(updateQuery, (err, result) => {
                    if (err) throw err;
                    response.status(200);
                    response.send("Password updated successfully");
                });
            }
        }
    });
});