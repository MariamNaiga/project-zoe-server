import {Body, Controller, HttpException, Post, Put, Req, UseGuards} from '@nestjs/common';
import {UsersService} from '../users.service';
import {ApiTags} from '@nestjs/swagger';
import {JwtAuthGuard} from '../../auth/guards/jwt-auth.guard';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {Request} from 'express';
import Email from '../../crm/entities/email.entity';
import {ForgotPasswordResponseDto} from '../dto/forgot-password-response.dto';
import {ResetPasswordResponseDto} from '../dto/reset-password-response.dto';
import {ValidatePasswordDto, ValidateEmailDto} from '../dto/reset-password.dto';
import {isValidPassword} from 'src/utils/validation';

@ApiTags("User")
@Controller('api/user')
export class UserController {
    constructor(@InjectRepository(Email)
                private readonly emailRepository: Repository<Email>,
                private readonly service: UsersService) {
    }

    @Post('forgotPassword')
    async forgotPassword(@Body() data: ValidateEmailDto): Promise<ForgotPasswordResponseDto> {
        return this.service.forgotPassword(data.email);
    }

    @UseGuards(JwtAuthGuard)
    @Put('resetPassword')
    async resetPassword(@Body() data: ValidatePasswordDto, @Req() request: Request): Promise<ResetPasswordResponseDto> {
      if (await (isValidPassword(data.password))) {
        const token = request.headers.authorization.replace('Bearer ', '');
        return this.service.resetPassword(token, data.password);
      }
      throw new HttpException("Invalid Password (Password Doesn't Meet Criteria)", 404);
    }  
}