const { Buffer } = require('../../packages/buffer');

const VerifyPDFError = require('../VerifyPDFError');
const { getSignatureMeta, preparePDF } = require('./general');

const getSubstringIndex = (str, substring, n) => {
  let times = 0;
  let index = null;

  while (times < n && index !== -1) {
    index = str.indexOf(substring, index + 1);
    times += 1;
  }

  return index;
};

const extractSignature = (pdf, signatureCount = 1) => {
  const byteRangePos = getSubstringIndex(pdf, '/ByteRange [', signatureCount);

  if (byteRangePos === -1) {
    throw new VerifyPDFError(
      'Failed to locate ByteRange.',
      VerifyPDFError.TYPE_PARSE,
    );
  }

  const byteRangeEnd = pdf.indexOf(']', byteRangePos);

  if (byteRangeEnd === -1) {
    throw new VerifyPDFError(
      'Failed to locate the end of the ByteRange.',
      VerifyPDFError.TYPE_PARSE,
    );
  }

  const byteRange = pdf.slice(byteRangePos, byteRangeEnd + 1).toString();
  const ByteRangeMatch = /\/ByteRange \[(\d+) +(\d+) +(\d+) +(\d+) *\]/.exec(byteRange);

  if (!ByteRangeMatch) {
    throw new VerifyPDFError(
      'Failed to locate ByteRange.',
      VerifyPDFError.TYPE_PARSE,
    );
  }

  const pdfBuffer = preparePDF(pdf);
  const ByteRange = ByteRangeMatch.slice(1).map(Number);

  const signedData = Buffer.concat([
    pdfBuffer.slice(ByteRange[0], ByteRange[0] + ByteRange[1]),
    pdfBuffer.slice(ByteRange[2], ByteRange[2] + ByteRange[3]),
  ]);
  const signatureHex = pdfBuffer.slice(ByteRange[0] + ByteRange[1] + 1, ByteRange[2]).toString('latin1');
  const signature = Buffer.from(signatureHex, 'hex').toString('latin1');
  return {
    ByteRange,
    signature,
    signedData,
    signatureMeta: getSignatureMeta(signedData),
  };
};

module.exports = extractSignature;
