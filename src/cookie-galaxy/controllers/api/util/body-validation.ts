import * as mongodb from 'mongodb';

/**
 * A validator function for an attribute.
 *
 * This type returns a value to allow type parameters to be used for strongly-typed metadata.
 * This value goes unused in implementation, however.
 */
export type AttributeValidatorFunction<T> =
  (obj: object, attr: string | number | symbol) => T;

/**
 * A single entry for validation metadata.
 */
export type ValidationMetadataEntry<T> =
  AttributeValidatorFunction<T> | ComplexAttributeValidator<T>;

/**
 * Maps a type to the proper type of the validation metadata entry.
 *
 * Used to strongly type metadata objects according to an interface.
 */
type TypeToValidationMetadataEntry<T> =
  T extends string ? AttributeValidatorFunction<string>
  : T extends number ? AttributeValidatorFunction<number>
  : T extends boolean ? AttributeValidatorFunction<boolean>
  : T extends Array<any> ? ComplexAttributeValidator<T[0]>
  : T extends mongodb.ObjectId ? AttributeValidatorFunction<mongodb.ObjectId>
  : T extends object ? ComplexAttributeValidator<T>
  : never;

type RequiredKeys<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? never : K }[keyof T];
type OptionalKeys<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? K : never }[keyof T];

type BodyValidationMetadataRequiredOnly<T> = {
  required: {
    [attr in RequiredKeys<T>]: TypeToValidationMetadataEntry<T[attr]>
  },
};

type BodyValidationMetadataWithOptional<T> = {
  required: {
    [attr in RequiredKeys<T>]: TypeToValidationMetadataEntry<T[attr]>
  },
  optional: {
    [attr in OptionalKeys<T>]: TypeToValidationMetadataEntry<T[attr]>
  },
};

/**
 * Body validation metadata.
 *
 * Maps an attribute to a validation metadata entry which validates the presence and data type of
 * that attribute.
 */
export type BodyValidationMetadata<T> = [OptionalKeys<T>] extends [never]
  ? BodyValidationMetadataRequiredOnly<T>
  : BodyValidationMetadataWithOptional<T>;

/**
 * A complex attribute validator that has nested components.
 */
export abstract class ComplexAttributeValidator<T> {
  public abstract validate(obj: object, attr: string | number | symbol): T;
}

// Validates a single metadata entry.
function validateEntry(
  obj: object, attr: string | number | symbol, validator: ValidationMetadataEntry<any>,
): void {
  if (validator instanceof ComplexAttributeValidator) {
    validator.validate(obj, attr);
  } else if (typeof validator === 'function') {
    validator(obj, attr);
  } else {
    throw new Error(`Validator for attribute "${attr.toString()}" is an invalid type`);
  }
}

/**
 * Validates the given object according to the metadata.
 *
 * Throws an error when validation fails.
 * @param obj Object to validate.
 * @param validator Validation metadata to validate against.
 */
export function validateBody<T extends object>(
  obj: object, validator: BodyValidationMetadata<T>,
): asserts obj is T {
  const requiredKeySet = new Set(Object.keys(validator.required));
  const optionalKeySet = (validator as any).optional
    ? new Set(Object.keys((validator as BodyValidationMetadataWithOptional<T>).optional))
    : undefined;

  const objectKeys = Object.keys(obj);
  for (const key of objectKeys) {
    if (requiredKeySet.has(key)) {
      validateEntry(obj, key, validator.required[key]);
      requiredKeySet.delete(key);
    } else if (optionalKeySet && optionalKeySet.has(key)) {
      validateEntry(obj, key, (validator as BodyValidationMetadataWithOptional<T>).optional[key]);
      optionalKeySet.delete(key);
    } else {
      throw new Error(`Unexpected attribute "${key}" found`);
    }
  }

  if (requiredKeySet.size !== 0) {
    throw new Error(
      `Missing required attributes: ${
        [...requiredKeySet.values()].map((key) => `"${key}"`).join(',')
      }`,
    );
  }
}

/**
 * An object attribute validator.
 *
 * Validates all nesetd attribute of the object.
 */
export class ObjectAttributeValidator<T> extends ComplexAttributeValidator<T> {
  public constructor(private readonly nestedMetadata: BodyValidationMetadata<T>) {
    super();
  }

  public validate(obj: object, attr: string): T {
    const nestedObj = obj[attr];
    if (!nestedObj) {
      throw new Error(`Missing "${attr}" attribute`);
    }
    if (typeof nestedObj !== 'object' || Array.isArray(nestedObj)) {
      throw new Error(`Expected attribute "${attr}" to be an object`);
    }

    validateBody(nestedObj, this.nestedMetadata);
    return undefined;
  }
}

/**
 * An array atribute validator.
 *
 * Validates each element in the array.
 */
export class ArrayAttributeValidator<T> extends ComplexAttributeValidator<T> {
  public constructor(private readonly nestedValidator: ValidationMetadataEntry<T>) {
    super();
  }

  public validate(obj: object, attr: string): T {
    const nestedArr = obj[attr];
    if (!nestedArr) {
      throw new Error(`Missing "${attr}" attribute`);
    }
    if (typeof nestedArr !== 'object' || !Array.isArray(nestedArr)) {
      throw new Error(`Expected attribute "${attr}" to be an array`);
    }
    for (let i = 0; i < nestedArr.length; i += 1) {
      validateEntry(nestedArr, i, this.nestedValidator);
    }
    return undefined;
  }
}

/**
 * Enum of attribute validators for simple JSON types.
 */
export module AttributeValidator {
  export const String: AttributeValidatorFunction<string> = (obj, attr) => {
    if (typeof obj[attr] !== 'string') {
      throw new Error(`Expected attribute "${attr.toString()}" to be a string`);
    }
    return undefined;
  };

  export function StringEnum(values: string[]): AttributeValidatorFunction<string> {
    return (obj, attr) => {
      if (typeof obj[attr] !== 'string') {
        throw new Error(`Expected attribute "${attr.toString()}" to be a string`);
      }
      if (!values.includes(obj[attr])) {
        throw new Error(`Unexpected value "${obj[attr]}" for attribute "${attr.toString()}"`);
      }

      return undefined;
    };
  }

  export const Number: AttributeValidatorFunction<number> = (obj, attr) => {
    if (typeof obj[attr] !== 'number') {
      throw new Error(`Expected attribute "${attr.toString()}" to be a number`);
    }
    return undefined;
  };

  export const Boolean: AttributeValidatorFunction<boolean> = (obj, attr) => {
    if (typeof obj[attr] !== 'boolean') {
      throw new Error(`Expected attribute "${attr.toString()}" to be a boolean`);
    }
    return undefined;
  };

  export function Object<T>(nestedMetadata: BodyValidationMetadata<T>) {
    return new ObjectAttributeValidator<T>(nestedMetadata);
  }

  export function Array<T>(nestedValidator: ValidationMetadataEntry<T>) {
    return new ArrayAttributeValidator<T>(nestedValidator);
  }

  export const ObjectId: AttributeValidatorFunction<mongodb.ObjectId> = (obj, attr) => {
    obj[attr] = new mongodb.ObjectId(obj[attr]);
    return undefined;
  };

  export const PositiveNumber: AttributeValidatorFunction<number> = (obj, attr) => {
    AttributeValidator.Number(obj, attr);
    if (obj[attr] as number <= 0) {
      throw new Error(`Expected attribute "${attr.toString()}" to be a positive number`);
    }
    return undefined;
  };
}
