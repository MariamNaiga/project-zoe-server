import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { usersEntities } from './users.helpers';
import { UsersController } from './controllers/users.controller';
import { UserController } from './controllers/user.controller';
import { CrmModule } from '../crm/crm.module';
import { crmEntities } from '../crm/crm.helpers';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from 'src/auth/constants';
import { JwtStrategy } from 'src/auth/strategies/jwt.strategy';


@Module({
  imports: [
    TypeOrmModule.forFeature([...usersEntities,...crmEntities]), 
    CrmModule,
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: {expiresIn: 60 * 10 * 1000},
    }),
  ],
  providers: [UsersService, JwtStrategy],
  exports: [UsersService],
  controllers: [UsersController, UserController],
})
export class UsersModule {
}
