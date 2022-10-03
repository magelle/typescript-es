import { serialize, deserialize } from 'bson';
import {Serializer} from "../../framework";

export default class MessagePackSerializer implements Serializer<Uint8Array> {
    serialize = <T>(value: T): Uint8Array => {
        return serialize(value)
    }

    deserialize = <T>(value: Uint8Array): T => {
        return deserialize(value) as T
    }
}
