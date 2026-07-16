/** @module Redirect server for Auto Editor documentation — maps legacy URL paths to the current external documentation domain. */
import express from "express";
import { exec } from "node:child_process";
import * as path from "path";

const app = express();

/**
 * Sanitize a request path before appending it to a fixed redirect host.
 * Guarantees a single leading slash and rejects protocol-relative ("//"),
 * userinfo ("@"), or backslash tricks that enable open-redirects.
 */
function safeRedirectPath(reqPath) {
	if (typeof reqPath !== "string") return "/";
	// Collapse backslashes, strip control chars, ensure single leading slash.
	const cleaned = reqPath.replace(/\\/g, "/").replace(/[\u0000-\u001f]/g, "");
	if (
		!cleaned.startsWith("/") ||
		cleaned.startsWith("//") ||
		cleaned.includes("@")
	) {
		return "/";
	}
	return cleaned;
}

app.get("/app/{*splat}", (req, res) => {
	const newPath = safeRedirectPath(req.path).replace("/app/", "/");
	res.redirect(301, `https://app.Lazynext-Editor.com${newPath}`);
});

app.get("/blog", (req, res) => {
	res.redirect(301, `https://basswood-io.com/blog`);
});
app.get("/blog/{*splat}", (req, res) => {
	res.redirect(301, `https://basswood-io.com${safeRedirectPath(req.path)}`);
});

app.get("/options", (req, res) => {
	res.redirect(301, "https://Lazynext-Editor.com/ref/options");
});

app.use(
	express.static("public", {
		index: ["index.html"],
		extensions: ["html"],
		setHeaders: (res, filep, stat) => {
			if (path.extname(filep) === "") {
				res.set("Content-Type", "text/html");
			}
			if (
				filep.includes("/wasm") ||
				filep.endsWith(".wasm") ||
				filep.endsWith(".js")
			) {
				res.set("Cross-Origin-Opener-Policy", "same-origin");
				res.set("Cross-Origin-Embedder-Policy", "require-corp");
			}
		},
	}),
);

app.use((req, res) => {
	const options = {
		headers: { "Content-Type": "text/html" },
	};
	res.status(404).sendFile(path.join(__dirname, "public/404"), options);
});

app.listen(1337, (req, res) => console.log("running on http://localhost:1337"));
