import * as userService from "../services/userService";
import { loginUserController, logoutUserController, refreshAccessTokenController, createUserController, deleteUserController } from "../controllers/authControllers";
import bcrypt from "bcryptjs";
import jwt from 'jsonwebtoken';
import { Types } from "mongoose";

jest.mock("jsonwebtoken");
jest.mock("bcryptjs");
jest.mock("../services/userService");
const mockedService = userService as jest.Mocked<typeof userService>

describe("Auth Controllers", () => {
    let req: any;
    let res: any;

    beforeEach(() => {
        req = {
            params: {},
            body: {},
            user: {},
            cookies: {}
        };
        res = {
            status: jest.fn(() => res),
            json: jest.fn(),
            clearCookie: jest.fn(),
            cookie: jest.fn()
        };
        jest.clearAllMocks();
    })

    beforeAll(() => {
        process.env.REFRESH_TOKEN = "testRefreshSecret";
        process.env.ACCESS_TOKEN = "testAccessSecret";
        process.env.ACCESS_TOKEN_EXPIRE = "900";
        process.env.REFRESH_TOKEN_EXPIRE = "604800";
    })

    describe("createUserController", () => {
        it("returns 400 if password not passed", async () => {
            req.body.email = "test@test.com"
            await createUserController(req, res);

            expect(mockedService.createUser).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: "Password is required to create new account",
                success: false
            })
        });
        it("returns 400 if email not passed", async () => {
            req.body.password = "testPassword";
            await createUserController(req, res);

            expect(mockedService.createUser).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: "Email is required to create new account",
                success: false
            })
        })
        it("returns 409 if user with email already exists", async () => {
            req.body.email = "test@test.com";
            req.body.password = "testPassword";

            const existingUser = {
                _id: "409",
                email: "test@test.com"
            };
            mockedService.getUserByEmail.mockResolvedValue(existingUser as any);

            await createUserController(req, res);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({
                message: "User already exists!",
                success: false
            })
        })
        it("returns 201 if created user", async () => {
            req.body.email = "test@test.com";
            req.body.password = "testPassword";
            (bcrypt.hash as jest.Mock).mockResolvedValue("hashedPassword");

            const fakeUser = {
                email: "test@test.com",
                hashedPassword: "hashedPassword"
            }

            mockedService.getUserByEmail.mockResolvedValue(null);
            mockedService.createUser.mockResolvedValue(fakeUser as any);

            await createUserController(req, res);

            expect(mockedService.createUser).toHaveBeenCalledWith("test@test.com", "hashedPassword");

            let hashedPassword;
            if (mockedService.createUser.mock.calls[0]?.[1]) {
                hashedPassword = mockedService.createUser.mock.calls[0][1];
            } else {
                throw new Error("Mock function was not called");
            }

            expect(hashedPassword).not.toBe("testPassword");
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                message: "Successfully created a user",
                success: true
            })
        })
        it("returns 500 if service throws", async () => {
            req.body.email = "test@test.com";
            req.body.password = "testPassword";

            mockedService.getUserByEmail.mockRejectedValue(null);
            mockedService.createUser.mockRejectedValue(new Error("DB failure"));

            await createUserController(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: "Server Error",
                success: false
            })
        })
    })
    describe("loginUserController", () => {
        it("returns 400 if password not passed", async () => {
            req.body.email = "test@test.com"
            await loginUserController(req, res);

            expect(mockedService.getUserByEmail).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: "Password is required to Login into account",
                success: false
            })
        });
        it("returns 400 if email not passed", async () => {
            req.body.password = "testPassword";
            await loginUserController(req, res);

            expect(mockedService.getUserByEmail).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: "Email is required to Login into account",
                success: false
            })
        })
        it("returns 404 if user doesn't exist", async () => {
            req.body.email = "test@test.com";
            req.body.password = "testPassword";

            mockedService.getUserByEmail.mockResolvedValue(null);

            await loginUserController(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                message: "User doesn't exist!",
                success: false
            })
        })
        it("returns 401 if invalid credentials", async () => {
            req.body.email = "test@test.com";
            req.body.password = "wrong-password";
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            const fakeUser = {
                email: "test@test.com",
                hashedPassword: "hashedPassword"
            }

            mockedService.getUserByEmail.mockResolvedValue(fakeUser as any);

            await loginUserController(req, res);

            expect(bcrypt.compare).toHaveBeenCalledWith("wrong-password", "hashedPassword");
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                message: "Invalid credentials",
                success: false
            })
        })
        it("returns 200 if logged in", async () => {
            req.body.email = "test@test.com";
            req.body.password = "testPassword";

            const user = {
                email: "test@test.com",
                hashedPassword: "hashedPassword",
                refreshToken: null,
                _id: expect.any(Types.ObjectId),
                save: jest.fn().mockResolvedValue(true)
            };

            mockedService.getUserByEmail.mockResolvedValue(user as any);


            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            (jwt.sign as jest.Mock)
                .mockImplementationOnce(() => "accessToken")
                .mockImplementationOnce(() => "refreshToken");

            await loginUserController(req, res);

            expect(user.save).toHaveBeenCalledTimes(1);
            expect(res.cookie).toHaveBeenCalledWith(
                "accessToken",
                "accessToken",
                expect.objectContaining({
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "lax",
                    maxAge: 1000 * 60 * 15
                }))
            expect(res.cookie).toHaveBeenCalledWith(
                "refreshToken",
                "refreshToken",
                expect.objectContaining({
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "lax",
                    maxAge: 1000 * 60 * 60 * 24 * 7
                }))
            expect(bcrypt.compare).toHaveBeenCalledWith("testPassword", "hashedPassword");
            expect(mockedService.getUserByEmail).toHaveBeenCalledWith("test@test.com");
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                message: "Successfully Logged In",
                success: true,
                user: {
                    userId: user._id,
                    userEmail: user.email
                }
            })
        })
        it("returns 500 if service throws", async () => {
            req.body.email = "test@test.com";
            req.body.password = "testPassword";

            const user = {
                email: "test@test.com",
                hashedPassword: "hashedPassword",
                refreshToken: null,
                _id: expect.any(Types.ObjectId),
                save: jest.fn().mockResolvedValue(true)
            };

            mockedService.getUserByEmail.mockRejectedValue(new Error("DB failure"));
            await loginUserController(req, res);

            expect(user.save).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: "Server Error",
                success: false
            })
        })
    })
    describe("logoutUserController", () => {
        it("returns 400 if no ID is found", async () => {
            await logoutUserController(req, res);

            expect(mockedService.getUserById).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: "Id is required to logout",
                success: false
            })
        })
        it("returns 404 if user not found", async () => {
            req.user.userId = "123";

            mockedService.getUserById.mockResolvedValue(null);

            await logoutUserController(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                message: "User not found",
                success: false
            })
        })
        it("returns 200 if logged out user", async () => {
            const user = {
                refreshToken: "refreshToken",
                save: jest.fn().mockResolvedValue(true),
                userId: "123"
            }
            req.user = { userId: "123", email: "test@test.com" };

            mockedService.getUserById.mockResolvedValue(user as any);

            await logoutUserController(req, res);

            expect(user.refreshToken).toBe(undefined);
            expect(user.save).toHaveBeenCalledTimes(1);
            expect(mockedService.getUserById).toHaveBeenCalledWith("123");
            expect(res.clearCookie).toHaveBeenCalledWith("refreshToken");
            expect(res.clearCookie).toHaveBeenCalledWith("accessToken");
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                message: "Successfully logged out",
                success: true
            })
        })
        it("returns 500 if service throws", async () => {
            const user = {
                refreshToken: "refreshToken",
                save: jest.fn().mockResolvedValue(true),
                userId: "123"
            }
            req.user = { userId: "123", email: "test@test.com" };

            mockedService.getUserById.mockRejectedValue(new Error("DB failure"));

            await logoutUserController(req, res);

            expect(user.save).not.toHaveBeenCalled();
            expect(mockedService.getUserById).toHaveBeenCalledWith("123");
            expect(res.clearCookie).not.toHaveBeenCalled();
            expect(res.clearCookie).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: "Server Error",
                success: false
            })
        })
    })
    describe("refreshAccessTokenController", () => {
        it("returns 200 if access token exists, no need for refresh", async () => {
            req.cookies = { accessToken: "accessToken", refreshToken: "refreshToken" };

            await refreshAccessTokenController(req, res);

            expect(res.status).toHaveBeenCalledWith(200)
            expect(res.json).toHaveBeenCalledWith({
                message: "Token exists. Token wasn't refreshed",
                success: true
            })
        })
        it("returns 401 if refreshToken doesnt exist", async () => {
            req.cookies = { accessToken: null, refreshToken: null }
            await refreshAccessTokenController(req, res);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                message: "Refresh Token expired!",
                success: false
            })
        })
        it("returns 403 if invalid refreshToken", async () => {
            req.cookies = { accessToken: null, refreshToken: "fakeRefreshToken" };

            const decodedUser = {
                userId: "123",
                email: "test@test.com",
                createdAt: new Date().toISOString()
            };

            (jwt.verify as jest.Mock).mockReturnValue(decodedUser);

            mockedService.getUserById.mockResolvedValue({
                _id: "123",
                email: "test@test.com",
                refreshToken: "realRefreshToken",
                createdAt: new Date()
            } as any);

            await refreshAccessTokenController(req, res);

            expect(mockedService.getUserById).toHaveBeenCalledWith("123");
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                message: "Invalid refresh token",
                success: false
            });
        });
        it("returns 200 if updated access token", async () => {
            req.cookies = { accessToken: null, refreshToken: "refreshToken" };

            const decodedUser = {
                userId: "123",
                email: "test@test.com",
                createdAt: new Date().toISOString()
            };

            (jwt.verify as jest.Mock).mockReturnValue(decodedUser);

            mockedService.getUserById.mockResolvedValue({
                _id: "123",
                email: "test@test.com",
                refreshToken: "refreshToken",
                createdAt: new Date()
            } as any);

            (jwt.sign as jest.Mock).mockReturnValue("accessToken");

            await refreshAccessTokenController(req, res);

            expect(res.cookie).toHaveBeenCalledWith(
                "accessToken",
                "accessToken",
                expect.objectContaining({
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "lax",
                    maxAge: 1000 * 60 * 15
                }))
            expect(mockedService.getUserById).toHaveBeenCalledWith("123");
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                message: "Successfully refreshed User Access Token",
                success: true
            })
        })
        it("returns 500 if service throws", async () => {
            req.cookies = { accessToken: null, refreshToken: "refreshToken" };

            const decodedUser = {
                userId: "123",
                email: "test@test.com",
                createdAt: new Date().toISOString()
            };

            (jwt.verify as jest.Mock).mockReturnValue(decodedUser);

            mockedService.getUserById.mockRejectedValue(new Error("DB failure"));

            (jwt.sign as jest.Mock).mockReturnValue("accessToken");

            await refreshAccessTokenController(req, res);

            expect(res.cookie).not.toHaveBeenCalled();
            expect(jwt.sign).not.toHaveBeenCalled();
            expect(mockedService.getUserById).toHaveBeenCalledWith("123");
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: "Server Error",
                success: false
            })
        })
    })
    describe("deleteUserController", () => {
        it("returns 400 if ID is not passed", async () => {
            await deleteUserController(req, res);

            expect(mockedService.getUserById).not.toHaveBeenCalled();
            expect(mockedService.deleteUser).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: "ID is required to delete account",
                success: false
            })
        })
        it("returns 404 if user not found under ID", async () => {
            req.user.userId = "123";

            mockedService.getUserById.mockResolvedValue(null);

            await deleteUserController(req, res);

            expect(mockedService.deleteUser).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                message: `No user exists under ID: ${req.user.userId}`,
                success: false
            })
        })
        it("returns 200 if deleted user", async () => {
            req.user = { userId: "123", email: "test@test.com" }

            const user = {
                _id: "123",
                email: "test@test.com"
            };

            mockedService.getUserById.mockResolvedValue(user as any);
            mockedService.deleteUser.mockResolvedValue(true);

            await deleteUserController(req, res);

            expect(mockedService.deleteUser).toHaveBeenCalledWith("123");
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                message: `Successfully deleted user ${user.email}`,
                success: true
            })
        })
        it("returns 500 when service throws", async () => {
            req.user.userId = "123";
            mockedService.getUserById.mockRejectedValue(new Error("DB Error"));

            await deleteUserController(req, res);

            expect(mockedService.deleteUser).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: "Server Error",
                success: false
            })
        })
    })
})