import {Injectable, HttpException} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {User} from './user.entity';
import {RegisterUserDto} from '../auth/dto/register-user.dto';
import SearchDto from '../shared/dto/search.dto';
import {ContactsService} from '../crm/contacts.service';
import Contact from '../crm/entities/contact.entity';
import {UpdateUserDto} from "./dto/update-user.dto";
import {ResetPasswordResponseDto} from './dto/reset-password-response.dto';
import {ForgotPasswordResponseDto} from './dto/forgot-password-response.dto';
import {UserListDto} from "./dto/user-list.dto";
import {getPersonFullName} from "../crm/crm.helpers";
import {hasValue} from "../utils/basicHelpers";
import {QueryDeepPartialEntity} from "typeorm/query-builder/QueryPartialEntity";
import {JwtService} from '@nestjs/jwt';
import {IEmail, sendEmail} from 'src/utils/mailerTest';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private readonly repository: Repository<User>,
        private readonly contactsService: ContactsService,
        private readonly jwtService: JwtService
    ) {
    }

    async findAll(req: SearchDto): Promise<UserListDto[]> {
        const data = await this.repository.find({
            relations: ['contact', 'contact.person'],
            skip: req.skip,
            take: req.limit,
        });
        return data.map(this.toListModel)
    }

    toListModel(user: User): UserListDto {
        const fullName = getPersonFullName(user.contact.person);
        return {
            avatar: user.contact.person.avatar,
            contact: {
                id: user.contactId,
                name: fullName
            },
            id: user.id,
            roles: user.roles,
            username: user.username,
            contactId: user.contactId,
            fullName
        }
    }

    async create(data: User): Promise<User> {
        data.hashPassword();
        return await this.repository.save(data);
    }

    async register(dto: RegisterUserDto): Promise<User> {
        const contact = await this.contactsService.createPerson(dto);
        const user = new User();
        user.username = dto.email;
        user.password = dto.password;
        user.contact = Contact.ref(contact.id);
        user.roles = dto.roles
        user.hashPassword();
        return await this.repository.save(user);
    }

    async findOne(id: number): Promise<UserListDto> {
        const data = await this.repository.findOne(id, {
            relations: ['contact', 'contact.person']
        });
        return this.toListModel(data)
    }

    async update(data: UpdateUserDto): Promise<UserListDto> {
        const update: QueryDeepPartialEntity<User> = {
            roles: data.roles
        }

        if (hasValue(data.password)) {
            const user = new User()
            user.password = data.password;
            user.hashPassword()
            update.password = user.password;
        }

        await this.repository.createQueryBuilder()
            .update()
            .set(update)
            .where("id = :id", {id: data.id})
            .execute()
        return await this.findOne(data.id);
    }

    async remove(id: number): Promise<void> {
        await this.repository.delete(id);
    }

    async findByName(username: string): Promise<User | undefined> {
        return this.repository.findOne({where: {username}, relations: ['contact', 'contact.person']});
    }

    async exits(username: string): Promise<boolean> {
        const count = await this.repository.count({where: {username}});
        return count > 0;
    }
    async getUserToken(userId): Promise<string> {
        const payload = {"userId": userId};
        const token = await this.jwtService.signAsync(payload, {expiresIn: 60 * 10 * 1000}); // expires after 10 minutes
        return token;
    }

    async decodeToken(token: string): Promise<any> {
        const decoded = await this.jwtService.decode(token);
        return decoded;
    }

    async resetPassword(token: string, newPassword: string): Promise<ResetPasswordResponseDto> {
        const decodedToken = await this.decodeToken(token);
        const data: UpdateUserDto = {
            id: decodedToken.userId,
            password: newPassword,
            roles: (await this.findOne(decodedToken.userId)).roles
        }
        const user = await this.update(data);
        if(!user) {
            throw new HttpException("User Password Not Updated", 404);
        }

        const mailerData: IEmail = {
            to: `${(await user).username}`,
            subject: "Password Change Confirmation",
            html:
            `
                <h3>Hello ${(await user).fullName},</h3></br>
                <h4>Your Password has been changed successfully!<h4></br>
            `
        } 
        const mailURL = await sendEmail(mailerData);
        if (mailURL) {
            const message = "Password Change Successful"
            return { message, mailURL, user };
        }
        throw new HttpException("Password Not Changed", 400);
    }

    async forgotPassword(username: string): Promise<ForgotPasswordResponseDto> {
        const userExists = await this.findByName(username);
        if (!userExists) {
            throw new HttpException("User Not Found", 404);
        }
        
        const user = (await this.findOne(userExists.id));
        const token = await this.getUserToken(user.id);
        const resetLink = `http://localhost:4002/resetPassword/token=${token}`;

        const mailerData: IEmail = {
            to: `${(await user).username}`,
            subject: "Reset Password",
            html: 
            `
                <h3>Hello ${user.fullName}</h3></br>
                <h4>Here is a link to reset your Password!<h4></br>
                <a href=${resetLink}>Reset Password</a>
                <p>This link should expire in 10 minutes</p>
            `
        }
        const mailURL = await sendEmail(mailerData);
        return { token, mailURL, user };
    }
}
