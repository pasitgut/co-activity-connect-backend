import jwt from "jsonwebtoken";

export const authMiddleware = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    if (!authHeader) return res.status(401).json({ error: "No token provided"});
    console.log("Auth Header: ", authHeader);
    const token = authHeader.split(" ")[1];
    console.log("Token: ", token);
    if (!token) return res.status(401).json({ error: "Access denied" })

       jwt.verify(token, process.env.JWT_SECRET || "secret", (err, decoded) => {
            if (err) return res.status(403).json({ error: "Invalid token" });
            req.user = decoded;
            next();
        })
} 