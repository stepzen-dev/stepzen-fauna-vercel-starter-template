import fetch from "node-fetch";

// ## Security best practice
//
// This API route adds authorization headers and proxies GraphQL requests to
// StepZen. This way long-living StepZen API keys are never exposed to the
// browser which significantly reduces the risk of accidentially leaking them.
//
// StepZen APIs can as well be accessed directly from the browser, but in
// that case the security best practice is to use short-living JWTs instead
// of long-living API keys.
// https://stepzen.com/docs/access-control/access-control-jwt
export default async function handler(req, res) {
  try {
    const url = process.env.STEPZEN_ENDPOINT;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `apikey ${process.env.STEPZEN_API_KEY}`,
      },
      body: typeof req.body === "string" ? req.body : JSON.stringify(req.body),
    });
    res.status(response.status).send(response.body);
  } catch (error) {
    res.status(500).json({ error: `internal error: ${error}` });
  }
}
