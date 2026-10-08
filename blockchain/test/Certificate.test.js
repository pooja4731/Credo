const { expect } = require("chai");
const { ethers } = require("hardhat");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("Certificate", function () {
  let certificate, owner, institution, stranger;

  const certId = ethers.keccak256(ethers.toUtf8Bytes("CRD-2026-CSE-00123"));
  const certHash = ethers.keccak256(ethers.toUtf8Bytes("certificate-json-payload"));
  const cid = "bafybeigdyrztg4example";

  beforeEach(async function () {
    [owner, institution, stranger] = await ethers.getSigners();
    const Certificate = await ethers.getContractFactory("Certificate");
    certificate = await Certificate.deploy();
    await certificate.waitForDeployment();
  });

  it("only owner can approve issuers", async function () {
    await expect(
      certificate.connect(stranger).setIssuerApproval(institution.address, true)
    ).to.be.revertedWith("Certificate: caller is not the owner");

    await certificate.connect(owner).setIssuerApproval(institution.address, true);
    expect(await certificate.approvedIssuers(institution.address)).to.equal(true);
  });

  it("blocks issuance from unapproved institutions", async function () {
    await expect(
      certificate.connect(institution).issueCertificate(certId, certHash, cid)
    ).to.be.revertedWith("Certificate: not an approved issuer");
  });

  it("allows an approved institution to issue and verify a certificate", async function () {
    await certificate.connect(owner).setIssuerApproval(institution.address, true);

    await expect(
      certificate.connect(institution).issueCertificate(certId, certHash, cid)
    )
      .to.emit(certificate, "Issued")
      .withArgs(certId, certHash, cid, institution.address, anyValue);

    const [valid, record] = await certificate.verifyCertificate(certId, certHash);
    expect(valid).to.equal(true);
    expect(record.ipfsCID).to.equal(cid);
    expect(record.issuer).to.equal(institution.address);
  });

  it("rejects duplicate certificate IDs and duplicate hashes", async function () {
    await certificate.connect(owner).setIssuerApproval(institution.address, true);
    await certificate.connect(institution).issueCertificate(certId, certHash, cid);

    await expect(
      certificate.connect(institution).issueCertificate(certId, certHash, cid)
    ).to.be.revertedWith("Certificate: ID already used");

    const otherId = ethers.keccak256(ethers.toUtf8Bytes("CRD-2026-CSE-00124"));
    await expect(
      certificate.connect(institution).issueCertificate(otherId, certHash, cid)
    ).to.be.revertedWith("Certificate: hash already issued");
  });

  it("detects tampering via hash mismatch", async function () {
    await certificate.connect(owner).setIssuerApproval(institution.address, true);
    await certificate.connect(institution).issueCertificate(certId, certHash, cid);

    const tamperedHash = ethers.keccak256(ethers.toUtf8Bytes("tampered-payload"));
    const [valid] = await certificate.verifyCertificate(certId, tamperedHash);
    expect(valid).to.equal(false);
  });

  it("allows the issuer or owner to revoke, and revoked certs fail verification", async function () {
    await certificate.connect(owner).setIssuerApproval(institution.address, true);
    await certificate.connect(institution).issueCertificate(certId, certHash, cid);

    await expect(
      certificate.connect(stranger).revokeCertificate(certId)
    ).to.be.revertedWith("Certificate: not authorized to revoke");

    await expect(certificate.connect(institution).revokeCertificate(certId))
      .to.emit(certificate, "Revoked")
      .withArgs(certId, institution.address, anyValue);

    const [valid] = await certificate.verifyCertificate(certId, certHash);
    expect(valid).to.equal(false);
  });
});
