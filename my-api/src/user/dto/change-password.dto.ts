import {
    IsString,
    MinLength,
    registerDecorator,
    ValidationArguments,
    ValidationOptions
} from 'class-validator';


function Match(property: string, validationOptions?: ValidationOptions) {
    return function (object: object, propertyName: string) {
        registerDecorator({
            name: 'match',
            target: object.constructor,
            propertyName,
            constraints: [property],
            options: validationOptions,
            validator: {
                validate(value: string, args: ValidationArguments) {
                    const [relatedPropertyName] = args.constraints;
                    const relatedValue = (args.object as Record<string, unknown>)[
                        relatedPropertyName
                    ];

                    return value === relatedValue;
                }
            }
        });
    };
}


export class ChangePasswordDto {

    @IsString()
    oldPassword!:string;


    @IsString()
    @MinLength(6)
    newPassword!:string;


    @IsString()
    @MinLength(6)
    @Match('newPassword', {
        message: 'confirmPassword must match newPassword'
    })
    confirmPassword!:string;

}
