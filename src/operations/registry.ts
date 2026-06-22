import { globalRegistry } from '../operation-registry';
import { 
	Base64EncodeOperation, 
	Base64DecodeOperation 
} from './implementations/encodings/base64';
import { 
	URLEncodeOperation, 
	URLDecodeOperation 
} from './implementations/encodings/url';
import { 
	HexEncodeOperation, 
	HexDecodeOperation 
} from './implementations/encodings/hex';
import {
	BinaryEncodeOperation,
	BinaryDecodeOperation,
	DecimalEncodeOperation,
	DecimalDecodeOperation
} from './implementations/encodings/numeric';
import { 
	HTMLEntityEncodeOperation, 
	HTMLEntityDecodeOperation 
} from './implementations/encodings/html-entities';
import { 
	UnicodeEncodeOperation, 
	UnicodeDecodeOperation 
} from './implementations/encodings/unicode';
import { 
	JWTDecodeOperation 
} from './implementations/encodings/jwt';
import { 
	ToUtf8Operation, 
	FromUtf8Operation 
} from './implementations/encodings/charset-converter';
import { 
	MD5Operation 
} from './implementations/hashes/md5';
import { 
	SHA1Operation 
} from './implementations/hashes/sha1';
import { 
	SHA256Operation 
} from './implementations/hashes/sha256';
import { 
	SHA512Operation 
} from './implementations/hashes/sha512';
import { 
	JsonPrettifyOperation 
} from './implementations/beautify/json-prettify';
import { 
	XmlPrettifyOperation 
} from './implementations/beautify/xml-prettify';
import {
	JavaScriptPrettifyOperation,
	JavaScriptMinifyOperation
} from './implementations/beautify/javascript';
import { XmlMinifyOperation } from './implementations/beautify/xml-minify';
import { 
	DESEncryptOperation 
} from './implementations/encryption/des-encrypt';
import { 
	DESDecryptOperation 
} from './implementations/encryption/des-decrypt';
import { TripleDESEncryptOperation } from './implementations/encryption/triple-des-encrypt';
import { TripleDESDecryptOperation } from './implementations/encryption/triple-des-decrypt';
import { AESEncryptOperation } from './implementations/encryption/aes-encrypt';
import { AESDecryptOperation } from './implementations/encryption/aes-decrypt';
import { AESGCMEncryptOperation } from './implementations/encryption/aes-gcm-encrypt';
import { AESGCMDecryptOperation } from './implementations/encryption/aes-gcm-decrypt';
import { TimestampToDateOperation } from './implementations/datetime/timestamp-to-date';
import { DateToTimestampOperation } from './implementations/datetime/date-to-timestamp';
import {
	FindReplaceOperation,
	DeduplicateOperation,
	SortLinesOperation,
	AddLineAffixOperation,
	UpperCaseOperation,
	LowerCaseOperation,
	SwapCaseOperation,
	RemoveWhitespaceOperation,
	LineToSymbolOperation,
	JoinToSingleLineOperation,
	AutoWrapOperation
} from './implementations/data-format/text-tools';
import {
	ExtractStringOperation,
	ExtractLineCountOperation,
	ExtractIPv4Operation,
	ExtractUrlOperation,
	ExtractDomainOperation
} from './implementations/extract-analysis/extract-tools';
import {
	RemoveProtocolOperation,
	RemovePortOperation,
	ExtractRootDomainOperation,
	ExpandCidrOperation,
	ConvertIpFormatOperation
} from './implementations/url-ip/url-ip-tools';

export function registerAllOperations(): void {
	if (globalRegistry.listAll().length > 0) {
		return;
	}

	globalRegistry.register(new Base64EncodeOperation());
	globalRegistry.register(new Base64DecodeOperation());
	globalRegistry.register(new URLEncodeOperation());
	globalRegistry.register(new URLDecodeOperation());
	globalRegistry.register(new HexEncodeOperation());
	globalRegistry.register(new HexDecodeOperation());
	globalRegistry.register(new BinaryEncodeOperation());
	globalRegistry.register(new BinaryDecodeOperation());
	globalRegistry.register(new DecimalEncodeOperation());
	globalRegistry.register(new DecimalDecodeOperation());
	globalRegistry.register(new HTMLEntityEncodeOperation());
	globalRegistry.register(new HTMLEntityDecodeOperation());
	globalRegistry.register(new UnicodeEncodeOperation());
	globalRegistry.register(new UnicodeDecodeOperation());
	globalRegistry.register(new JWTDecodeOperation());
	globalRegistry.register(new MD5Operation());
	globalRegistry.register(new SHA1Operation());
	globalRegistry.register(new SHA256Operation());
	globalRegistry.register(new SHA512Operation());
	globalRegistry.register(new JsonPrettifyOperation());
	globalRegistry.register(new XmlPrettifyOperation());
	globalRegistry.register(new JavaScriptPrettifyOperation());
	globalRegistry.register(new JavaScriptMinifyOperation());
	globalRegistry.register(new XmlMinifyOperation());
	globalRegistry.register(new DESEncryptOperation());
	globalRegistry.register(new DESDecryptOperation());
	globalRegistry.register(new TripleDESEncryptOperation());
	globalRegistry.register(new TripleDESDecryptOperation());
	globalRegistry.register(new AESEncryptOperation());
	globalRegistry.register(new AESDecryptOperation());
	globalRegistry.register(new AESGCMEncryptOperation());
	globalRegistry.register(new AESGCMDecryptOperation());
	globalRegistry.register(new TimestampToDateOperation());
	globalRegistry.register(new DateToTimestampOperation());
	globalRegistry.register(new ToUtf8Operation());
	globalRegistry.register(new FromUtf8Operation());
	globalRegistry.register(new FindReplaceOperation());
	globalRegistry.register(new DeduplicateOperation());
	globalRegistry.register(new SortLinesOperation());
	globalRegistry.register(new AddLineAffixOperation());
	globalRegistry.register(new UpperCaseOperation());
	globalRegistry.register(new LowerCaseOperation());
	globalRegistry.register(new SwapCaseOperation());
	globalRegistry.register(new RemoveWhitespaceOperation());
	globalRegistry.register(new LineToSymbolOperation());
	globalRegistry.register(new JoinToSingleLineOperation());
	globalRegistry.register(new AutoWrapOperation());
	globalRegistry.register(new ExtractStringOperation());
	globalRegistry.register(new ExtractLineCountOperation());
	globalRegistry.register(new ExtractIPv4Operation());
	globalRegistry.register(new ExtractUrlOperation());
	globalRegistry.register(new ExtractDomainOperation());
	globalRegistry.register(new RemoveProtocolOperation());
	globalRegistry.register(new RemovePortOperation());
	globalRegistry.register(new ExtractRootDomainOperation());
	globalRegistry.register(new ExpandCidrOperation());
	globalRegistry.register(new ConvertIpFormatOperation());
}
