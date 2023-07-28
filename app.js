const express = require("express");

const app = express();

const jwt = require("jsonwebtoken");

const bcrypt = require("bcrypt");

app.use(express.json());

const sqlite = require("sqlite");

const sqlite3 = require("sqlite3");

const path = require("path");

const filePath = path.join(__dirname, "covid19IndiaPortal.db");

let db = null;

const dbConnectionObj = async () => {
  try {
    db = await sqlite.open({ filename: filePath, driver: sqlite3.Database });
    //console.log(driver);
  } catch (e) {
    console.log(e.message);
    process.exit(1);
  }
};

dbConnectionObj();

app.listen(3000);

//API register
app.post("/register/", async (req, res) => {
  const { username, name, password, gender, location } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const registerQuery = `
           SELECT * FROM user 
           WHERE username='${username}';`;
  const dbUser = await db.get(registerQuery);
  if (dbUser === undefined) {
    const loginQuery = `
                   INSERT INTO user(username,name,password,gender,location)
              values(
                  '${username}',
                  '${name}',
                  '${hashedPassword}',
                  '${gender}',
                  '${location}'`;
    const response = await db.run(loginQuery);
  } else {
    res.status(400);
    res.send("User already exists");
  }
});
//API login
app.post("/login/", async (req, res) => {
  const { username, password } = req.body;
  const registerQuery = `
           SELECT * FROM user 
           WHERE username='${username}';`;
  const dbUser = await db.get(registerQuery);
  if (dbUser === undefined) {
    res.status(400);
    res.send("Invalid user");
  } else {
    let jwtToken;
    const checkPassword = await bcrypt.compare(password, dbUser.password);
    if (checkPassword === true) {
      let payload = { username: username };
      jwtToken = jwt.sign(payload, "VENKY");
      //console.log(jwtToken);
      res.send({ jwtToken: jwtToken });
    } else {
      res.status(400);
      res.send("Invalid password");
    }
  }
});

//Token Authentication

const authenticate = (req, res, next) => {
  const auth = req.headers["authorization"];
  //console.log(auth);
  let jwtToken;
  if (auth !== undefined) {
    jwtToken = auth.split(" ")[1];
    // console.log(jwtToken);
  }
  if (jwtToken === undefined) {
    res.status(401);
    res.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "VENKY", (error, payload) => {
      if (error) {
        res.status(401);
        res.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

const snake_camel = (each) => {
  return {
    districtId: each.district_id,
    districtName: each.district_name,
    stateId: each.state_id,
    cases: each.cases,
    cured: each.cured,
    active: each.active,
    deaths: each.deaths,
    stateName: each.state_name,
    population: each.population,
  };
};

//API CALL 2
app.get("/states/", authenticate, async (req, res) => {
  const query = `
       SELECT * FROM state;`;
  const response = await db.all(query);
  const mappedResponse = response.map((each) => snake_camel(each));
  res.send(mappedResponse);
});

//API CALL 3

app.get("/states/:stateId/", authenticate, async (req, res) => {
  const { stateId } = req.params;
  //console.log(req.params);
  const query = `
       SELECT * FROM state
       WHERE state_id=${stateId};`;
  const response = await db.get(query);
  res.send({
    stateId: response.state_id,
    stateName: response.state_name,
    population: response.population,
  });
});

//API ON DISTRICT
app.get("/districts/", authenticate, async (req, res) => {
  const query = `
       SELECT * FROM district;`;
  const response = await db.all(query);
  const mappedResponse = response.map((each) => snake_camel(each));
  res.send(mappedResponse);
});

//API CALL 4
app.post("/districts/", authenticate, async (req, res) => {
  const { districtName, stateId, cases, cured, active, deaths } = req.body;
  const query = `
  INSERT INTO district(district_name,state_id,cases,cured,active,deaths)
  values(
      '${districtName}',
      '${stateId}',
      '${cases}',
      '${cured}',
      '${active}',
      '${deaths}'
  );`;
  const response = await db.run(query);
  res.send("District Successfully Added");
});

//API CALL 5

app.get("/districts/:districtId/", authenticate, async (req, res) => {
  const { districtId } = req.params;
  //console.log(districtId);
  const query = `
       SELECT * FROM district
       WHERE district_id=${districtId};`;
  const response = await db.get(query);
  res.send({
    districtId: response.district_id,
    districtName: response.district_name,
    stateId: response.state_id,
    cases: response.cases,
    cured: response.cured,
    active: response.active,
    deaths: response.deaths,
  });
});

//API CALL 6

app.delete("/districts/:districtId/", authenticate, async (req, res) => {
  const { districtId } = req.params;
  const query = `
       DELETE FROM district
            WHERE
        district_id=${districtId};`;
  const response = await db.run(query);
  res.send("District Removed");
});

//API CALL 7
app.put("/districts/:districtId/", authenticate, async (req, res) => {
  const { districtName, stateId, cases, cured, active, deaths } = req.body;
  const { districtId } = req.params;
  const query = `
       UPDATE district SET 
         district_name='${districtName}',
         state_id='${stateId}',
         cases='${cases}',
         cured='${cured}',
         active='${active}',
         deaths='${deaths}',
       district_id=${districtId}
       WHERE district_id=${districtId};`;
  const response = await db.run(query);
  res.send("District Details Updated");
});

//API CALL 8

app.get("/states/:stateId/stats/", authenticate, async (req, res) => {
  const { stateId } = req.params;
  const query = `
         SELECT  sum(cases) as totalCases,
                    sum(cured) as totalCured,
                    sum(active)as totalActive,
                    sum(deaths) as totalDeaths
            FROM district 
         WHERE state_id=${stateId};`;
  const response = await db.get(query);
  res.send(response);
});

module.exports = app;
