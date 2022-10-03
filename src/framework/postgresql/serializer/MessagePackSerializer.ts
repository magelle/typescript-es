import {decode, encode} from "messagepack";
import {Serializer} from "../../framework";

export default class MessagePackSerializer implements Serializer<Uint8Array> {
    serialize = <T>(value: T): Uint8Array => {
        return encode<T>(value);
    }

    deserialize = <T>(value: Uint8Array): T => {
        return decode<T>(value);
    }
}
