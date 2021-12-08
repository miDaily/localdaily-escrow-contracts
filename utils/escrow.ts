import { BigNumber, ethers } from "ethers";

const saltToHex = (salt: string) => {
  salt = salt.toLowerCase();
  return salt.indexOf("0x") === -1
    ? ethers.utils.keccak256(ethers.utils.toUtf8Bytes(salt.toString()))
    : salt;
};

const encodeParams = (dataTypes: string[], data: any[]) => {
  return ethers.utils.defaultAbiCoder.encode(dataTypes, data);
};

const buildBytecode = (
  constructorTypes: string[],
  constructorArgs: any[],
  contractBytecode: string
) => {
  return `${contractBytecode}${encodeParams(
    constructorTypes,
    constructorArgs
  ).slice(2)}`;
};

const calculateCreate2 = (
  from: string,
  salt: string,
  byteCode: string,
  constructorArgs: { types: string[]; params: any[] }
) => {
  // make sure we have 0x
  byteCode = "0x" + byteCode.replace("0x", "");

  if (constructorArgs && byteCode.length === 66)
    throw new Error(
      "You can't pass in constructor arguments, and byte code as hash!"
    );

  // add constructor arguments manually, if present
  if (constructorArgs)
    byteCode = buildBytecode(
      constructorArgs.types,
      constructorArgs.params,
      byteCode
    );

  // dont hash it if its already a hash
  byteCode =
    byteCode.length !== 66 ? ethers.utils.keccak256(byteCode) : byteCode;

  const saltHex = saltToHex(salt);

  return ethers.utils.getCreate2Address(from, saltHex, byteCode);
};

export function doubleHash(secret: string): string {
  return ethers.utils.keccak256(ethers.utils.id(secret));
}

export function calculateEscrowCreate2Address(
  from: string,
  salt: string,
  byteCode: string,
  trustedForwarder: string,
  registry: string,
  registryId: BigNumber,
  token: string,
  amount: number,
  seller: string,
  buyer: string,
  secretsOfSeller: any[2],
  secretsOfBuyer: any[2],
  secretsOfArbitrator: any[2]
): string {
  return calculateCreate2(from, salt, byteCode, {
    params: [
      trustedForwarder,
      registry,
      registryId,
      token,
      amount,
      seller,
      buyer,
      secretsOfSeller,
      secretsOfBuyer,
      secretsOfArbitrator,
    ],
    types: [
      "address",
      "address",
      "uint256",
      "address",
      "uint256",
      "address",
      "address",
      "bytes32[2]",
      "bytes32[2]",
      "bytes32[2]",
    ],
  });
}
