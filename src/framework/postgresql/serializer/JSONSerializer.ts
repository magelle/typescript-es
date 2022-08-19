import {Serializer} from "../../framework";

export class JSONSerializer implements Serializer {
  serialize = <T>(value: T): string => {
    return JSON.stringify(value)
  }

  deserialize = <T>(value: string): T => {
    // @ts-ignore
    return value as T
  }
}
