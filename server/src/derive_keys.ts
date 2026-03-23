import { Ed25519Keypair } from "@onelabs/sui/keypairs/ed25519";

const keys = [
  "ACTcTm/zES8wqZynVGA7B4BGKJ/6uxcCVF11WfUciK+T",
  "ADtEHXt8r+TEna6BgZilLWgJ+cpLD6hxsksMrySGvPr2",
  "ALKTZh8gcw1qS1WPqhvhTCaMPvJTzjEml2DqMw/achGN",
  "AOeqxfMWRnXTInaqaPK8CZdrsTjup/dMvZCb8T0a4xvG",
  "AIhlZiuJkEaLCA1otHZ6xzLlFEBre1dhYI/NgoUw/O5T",
  "AIBTacrhqOvKQ5YPxPfA9RQ/ueqfoeItHu68ATCeMdoK",
  "ALiaZ8zs3q3wqgbMsUhKLE9nXlG+KaHHNkAGR+IjnfjF"
];

for (const key of keys) {
  try {
    const raw = Buffer.from(key, 'base64');
    // For Ed25519, the secret is from byte 1-32
    const kp = Ed25519Keypair.fromSecretKey(raw.slice(1));
    console.log(`${key} -> ${kp.toSuiAddress()}`);
  } catch (e) {
    console.log(`${key} -> error`);
  }
}
