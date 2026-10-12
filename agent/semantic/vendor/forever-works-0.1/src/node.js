import {readFile} from "node:fs/promises";
import {dirname, resolve, sep} from "node:path";
import {Model, createForeverApiFromModel} from "./model.js";

/** Load a model from a model directory or manifest path using Node.js. */
export async function loadModel(input) {
  const root = resolve(input.endsWith("manifest.json") ? dirname(input) : input);
  const manifest = JSON.parse(await readFile(resolve(root, "manifest.json"), "utf8"));
  const records = [];
  for (const paths of Object.values(manifest.records ?? {})) if (Array.isArray(paths)) for (const relative of paths) {
    const path = resolve(root, String(relative));
    if (!path.startsWith(root + sep)) throw new Error(`record path escapes model root: ${relative}`);
    records.push(JSON.parse(await readFile(path, "utf8")));
  }
  return new Model(manifest, records);
}

/** Load a model and expose the Public API v0.1 Node filesystem adapter. */
export async function createForeverApi(input) {
  return createForeverApiFromModel(await loadModel(input), {name: "node-filesystem"});
}
