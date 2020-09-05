import {
  Resolver,
  Mutation,
  InputType,
  Field,
  Arg,
  Ctx,
  ObjectType
} from 'type-graphql'
import { MyContext } from 'src/types'
import { User } from '../entities/User'
import argon2 from 'argon2'

@InputType()
class Inputs {
  @Field()
  username: string
  @Field()
  password: string
}

@ObjectType()
class FieldError {
  @Field()
  field: string
  @Field()
  message: string
}

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[]

  @Field(() => User, { nullable: true })
  user?: User
}

@Resolver()
export class UserResolver {
  @Mutation(() => UserResponse)
  async register(
    @Arg('inputs') inputs: Inputs,
    @Ctx() { em }: MyContext
  ): Promise<UserResponse> {
    if (inputs.username.length <= 2) {
      return {
        errors: [
          {
            field: 'username',
            message: 'lenght must be greater than 2'
          }
        ]
      }
    }

    if (inputs.password.length <= 3) {
      return {
        errors: [
          {
            field: 'password',
            message: 'lenght must be greater than 3'
          }
        ]
      }
    }

    const hashedPassword = await argon2.hash(inputs.password)
    const user = em.create(User, {
      username: inputs.username,
      password: hashedPassword
    })
    await em.persistAndFlush(user)
    return { user }
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg('inputs') inputs: Inputs,
    @Ctx() { em }: MyContext
  ): Promise<UserResponse> {
    const user = await em.findOne(User, { username: inputs.username })

    if (!user) {
      return {
        errors: [
          {
            field: 'username',
            message: "username doesn't exist"
          }
        ]
      }
    }

    const valid = await argon2.verify(user.password, inputs.password)
    if (!valid) {
      return {
        errors: [
          {
            field: 'password',
            message: 'incorrect password'
          }
        ]
      }
    }

    return { user }
  }
}