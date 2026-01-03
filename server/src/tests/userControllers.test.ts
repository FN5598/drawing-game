import { getAllUsersController, deleteUserController, getUserContoller } from "../controllers/userControllers";
import * as userService from "../services/userService";

jest.mock("../services/userService");
const mockedService = userService as jest.Mocked<typeof userService>



describe("User controllers", () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    req = { params: {} };
    res = { status: jest.fn(() => res), json: jest.fn() };
    jest.clearAllMocks();
  });

  describe("getAllUsersController", () => {
    it("returns 200 if users exist", async () => {
      const fakeUsers = [{ email: "@atest.com" }];
      mockedService.getAllUsers.mockResolvedValue(fakeUsers as any);

      await getAllUsersController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Successfully fetched users",
        success: true,
        users: fakeUsers
      })
    });
    it("returns 404 if no users found", async () => {
      mockedService.getAllUsers.mockResolvedValue([]);

      await getAllUsersController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "No users found", success: false });
    });
    it("returns 500 if service throws", async () => {
      mockedService.getAllUsers.mockRejectedValue(new Error("DB failure"));

      await getAllUsersController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "Server error", success: false });
    })
  });

  describe("deleteUserController", () => {
    it("returns 400 if user id is missing", async () => {
      await deleteUserController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "User ID is required",
        success: false
      });
    });
    it("returns 200 if user is deleted", async () => {
      req.params.id = "123";
      mockedService.deleteUser.mockResolvedValue(true);

      await deleteUserController(req, res);

      expect(mockedService.deleteUser).toHaveBeenCalledWith("123");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Successfully deleted user",
        success: true,
      })
    })
    it("returns 500 if service throws", async () => {
      mockedService.deleteUser.mockRejectedValue(new Error("DB fail"));
      req.params.id = "123";

      await deleteUserController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: "Server error", success: false });
    });
  })

  describe("getUserController", () => {
    it("returns 400 if user id is missing", async () => {
      await getUserContoller(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "ID is required",
        success: false
      })
    })
    it("returns 404 if user is not found", async () => {
      req.params.id = "404";
      mockedService.getUserById.mockResolvedValue(null);

      await getUserContoller(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "User not found",
        success: false
      })
    })
    it("returns 200 if user is found", async () => {
      req.params.id = "123";

      const fakeUser = {
        _id: "123",
        email: "test@test.com"
      }

      mockedService.getUserById.mockResolvedValue(fakeUser as any);

      await getUserContoller(req, res);

      expect(mockedService.getUserById).toHaveBeenCalledWith("123");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Successfully fetched user",
        success: true,
        user: fakeUser
      })
    })
    it("returns 500 if service throws", async () => {
      mockedService.getUserById.mockRejectedValue(new Error("DB fail"));
      req.params.id = "123";

      await getUserContoller(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Server error",
        success: false
      });
    })
  })
})