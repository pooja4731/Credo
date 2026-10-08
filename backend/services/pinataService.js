const axios = require("axios");
const FormData = require("form-data");

const PINATA_BASE_URL = "https://api.pinata.cloud";

function authHeaders() {
  // Prefer JWT auth if provided, fall back to API key/secret pair.
  if (process.env.PINATA_JWT) {
    return { Authorization: `Bearer ${process.env.PINATA_JWT}` };
  }
  return {
    pinata_api_key: process.env.PINATA_API_KEY,
    pinata_secret_api_key: process.env.PINATA_SECRET_API_KEY,
  };
}

/**
 * Uploads a file buffer (e.g. the generated certificate PDF) to Pinata.
 * @returns {Promise<{cid: string, url: string}>}
 */
async function uploadFileToPinata(buffer, filename, metadata = {}) {
  const formData = new FormData();
  formData.append("file", buffer, filename);
  formData.append(
    "pinataMetadata",
    JSON.stringify({ name: filename, keyvalues: metadata })
  );
  formData.append(
    "pinataOptions",
    JSON.stringify({ cidVersion: 1 })
  );

  const response = await axios.post(
    `${PINATA_BASE_URL}/pinning/pinFileToIPFS`,
    formData,
    {
      maxBodyLength: Infinity,
      headers: { ...formData.getHeaders(), ...authHeaders() },
    }
  );

  const cid = response.data.IpfsHash;
  return { cid, url: `${process.env.PINATA_GATEWAY}/${cid}` };
}

/**
 * Uploads a JSON object (e.g. certificate metadata) to Pinata.
 * @returns {Promise<{cid: string, url: string}>}
 */
async function uploadJSONToPinata(jsonData, name = "certificate-metadata") {
  const response = await axios.post(
    `${PINATA_BASE_URL}/pinning/pinJSONToIPFS`,
    {
      pinataContent: jsonData,
      pinataMetadata: { name },
      pinataOptions: { cidVersion: 1 },
    },
    { headers: { "Content-Type": "application/json", ...authHeaders() } }
  );

  const cid = response.data.IpfsHash;
  return { cid, url: `${process.env.PINATA_GATEWAY}/${cid}` };
}

/** Unpins a file from Pinata (used when revoking / correcting an issuance error). */
async function unpinFromPinata(cid) {
  await axios.delete(`${PINATA_BASE_URL}/pinning/unpin/${cid}`, {
    headers: authHeaders(),
  });
}

/** Fetches JSON metadata back from IPFS via the configured gateway. */
async function fetchFromIPFS(cid) {
  const response = await axios.get(`${process.env.PINATA_GATEWAY}/${cid}`, {
    timeout: 15000,
  });
  return response.data;
}

module.exports = {
  uploadFileToPinata,
  uploadJSONToPinata,
  unpinFromPinata,
  fetchFromIPFS,
};
