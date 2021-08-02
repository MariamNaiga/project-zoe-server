import { Test, TestingModule } from "@nestjs/testing"
import { GroupPrivacy } from "../enums/groupPrivacy";
import { GroupsService } from "../services/groups.service";
import { GroupController } from "./group.controller"

describe('GroupController', () => {
    let controller: GroupController;

    const mockGroupService = {
        update: jest.fn((dto) => {
            return {
                id: dto.id,
                privacy: dto.id,
                name: dto.name,
                details: dto.details,
                categoryId: dto.categoryId,
                category: {
                    id: dto.categoryId,
                    name: "Random Category"
                },
                parentId: dto.parentId,
                parent: {
                    id: dto.parentId,
                    name: "Immediate Parent"
                },
            };
        }),
    };

    beforeEach( async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [GroupController],
            providers: [GroupsService],
        })
            .overrideProvider(GroupsService)
            .useValue(mockGroupService)
            .compile();

        controller = module.get<GroupController>(GroupController);
    })

    it('should be defined', () => {
        expect(controller).toBeDefined();
    })

    it('should update a team/group', async () => {
        const dto = {
            id: Math.floor(Math.random() * 10),
            privacy: GroupPrivacy.Public,
            name: "Group A",
            details: "Details of Group A",
            categoryId: Date.name,
            parentId: Math.floor(Math.random() * 10),
            metaData: {},
            address: {
                country: "Uganda",
                district: "Kampala" ,
                placeId: Date.name,
                name: "A Random Place",
                latitude: Math.floor(Math.random() * 10),
                longitude: Math.floor(Math.random() * 10),
                geoCoordinates: Date.name,
                vicinity: Date.name
            },
        };

        const result = await controller.update(dto);
       
        expect(result).toEqual({
            id: dto.id,
            privacy: dto.id,
            name: dto.name,
            details: dto.details,
            categoryId: dto.categoryId,
            category: {
                id: dto.categoryId,
                name: expect.any(String)
            },
            parentId: dto.parentId,
            parent: {
                id: dto.parentId,
                name: expect.any(String)
            },
        });
    })
})

