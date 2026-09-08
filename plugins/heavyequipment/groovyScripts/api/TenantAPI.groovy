import org.apache.ofbiz.entity.GenericValue
import org.apache.ofbiz.entity.util.EntityQuery
import org.apache.ofbiz.base.util.UtilMisc
import org.apache.ofbiz.service.ServiceUtil
import groovy.json.JsonOutput
import javax.servlet.http.HttpServletRequest
import javax.servlet.http.HttpServletResponse
import java.sql.Timestamp

HttpServletRequest request = request
HttpServletResponse response = response
String action = request.getParameter("action")

response.setContentType("application/json")
response.setCharacterEncoding("UTF-8")

def out = response.getWriter()

def getSystemUserLogin() {
    def sessionUser = request.getSession().getAttribute("userLogin")
    if (sessionUser) return sessionUser
    return EntityQuery.use(delegator).from("UserLogin").where("userLoginId", "system").queryOne()
}

try {
    if ("list".equals(action)) {
        List<GenericValue> tenants = EntityQuery.use(delegator).from("Tenant").orderBy("tenantName").queryList()

        def tenantList = []
        for (GenericValue t : tenants) {
            def adminUsers = EntityQuery.use(delegator)
                .from("HeTenantUser")
                .where("tenantId", t.getString("tenantId"), "roleType", "TENANT_ADMIN")
                .filterByDate()
                .queryList()

            def admins = []
            for (def tu : adminUsers) {
                def ul = EntityQuery.use(delegator).from("UserLogin").where("userLoginId", tu.userLoginId).queryOne()
                def person = tu.partyId ? EntityQuery.use(delegator).from("Person").where("partyId", tu.partyId).queryOne() : null
                admins.add([
                    userLoginId: tu.userLoginId,
                    firstName: person?.firstName,
                    lastName: person?.lastName,
                    enabled: ul?.enabled ?: "N"
                ])
            }

            tenantList.add([
                tenantId: t.getString("tenantId"),
                tenantName: t.getString("tenantName"),
                initialPath: t.getString("initialPath"),
                disabled: t.getString("disabled"),
                adminUsers: admins
            ])
        }
        out.write(JsonOutput.toJson(tenantList))
    }
    else if ("create".equals(action)) {
        String tenantId = request.getParameter("tenantId")?.trim()?.toUpperCase()
        String tenantName = request.getParameter("tenantName")?.trim()
        String adminUsername = request.getParameter("adminUsername")?.trim()?.toLowerCase()
        String adminPassword = request.getParameter("adminPassword")
        String adminFirstName = request.getParameter("adminFirstName")?.trim()
        String adminLastName = request.getParameter("adminLastName")?.trim()
        String adminEmail = request.getParameter("adminEmail")?.trim()
        String initialPath = request.getParameter("initialPath")

        if (!tenantId || !tenantName) {
            response.setStatus(400)
            out.write(JsonOutput.toJson([error: "tenantId and tenantName are required"]))
            return "error"
        }

        // Default admin username: tangle_fleet → tangle_fleet_admin
        if (!adminUsername) {
            adminUsername = tenantId.toLowerCase() + "_admin"
        }
        if (!adminPassword) {
            response.setStatus(400)
            out.write(JsonOutput.toJson([error: "adminPassword is required for tenant admin account"]))
            return "error"
        }
        if (adminPassword.length() < 4) {
            response.setStatus(400)
            out.write(JsonOutput.toJson([error: "adminPassword must be at least 4 characters"]))
            return "error"
        }
        if (!adminFirstName) adminFirstName = "Tenant"
        if (!adminLastName) adminLastName = "Admin"

        // Check tenant exists
        GenericValue existing = EntityQuery.use(delegator).from("Tenant").where("tenantId", tenantId).queryOne()
        if (existing != null) {
            response.setStatus(400)
            out.write(JsonOutput.toJson([error: "Tenant already exists: " + tenantId]))
            return "error"
        }

        // Check username available
        GenericValue existingUser = EntityQuery.use(delegator).from("UserLogin").where("userLoginId", adminUsername).queryOne()
        if (existingUser != null) {
            response.setStatus(400)
            out.write(JsonOutput.toJson([error: "Username already taken: " + adminUsername]))
            return "error"
        }

        def userLogin = getSystemUserLogin()
        Timestamp now = new Timestamp(System.currentTimeMillis())

        // Step 1: Create Tenant record
        GenericValue newTenant = delegator.makeValue("Tenant", UtilMisc.toMap(
            "tenantId", tenantId,
            "tenantName", tenantName,
            "initialPath", initialPath ?: "/heavyequipment/control/app",
            "disabled", "N"
        ))
        delegator.create(newTenant)

        // Step 2: Create company PartyGroup
        String companyPartyId = null
        def pgResult = dispatcher.runSync("createPartyGroup", [
            groupName: tenantName,
            userLogin: userLogin
        ])
        if (!ServiceUtil.isError(pgResult)) {
            companyPartyId = pgResult.partyId
        }

        // Step 3: Create Tenant Admin Person + UserLogin
        def createUserCtx = [
            userLoginId: adminUsername,
            currentPassword: adminPassword,
            currentPasswordVerify: adminPassword,
            firstName: adminFirstName,
            lastName: adminLastName,
            enabled: "Y",
            requirePasswordChange: "N",
            userLogin: userLogin
        ]
        def userResult = dispatcher.runSync("createPersonAndUserLogin", createUserCtx)
        if (ServiceUtil.isError(userResult)) {
            throw new Exception("Failed to create tenant admin user: " + ServiceUtil.getErrorMessage(userResult))
        }

        String adminPartyId = userResult.partyId ?: userResult.newUserLogin?.partyId

        // Step 4: Assign HE_TENANT_ADMIN security group
        delegator.create("UserLoginSecurityGroup", [
            userLoginId: adminUsername,
            groupId: "HE_TENANT_ADMIN",
            fromDate: now
        ])

        // Step 5: Link user to tenant via HeTenantUser
        String heTenantUserId = delegator.getNextSeqId("HeTenantUser")
        delegator.create("HeTenantUser", [
            heTenantUserId: heTenantUserId,
            tenantId: tenantId,
            userLoginId: adminUsername,
            partyId: adminPartyId,
            companyPartyId: companyPartyId,
            roleType: "TENANT_ADMIN",
            fromDate: now
        ])

        out.write(JsonOutput.toJson([
            success: true,
            tenantId: tenantId,
            tenantName: tenantName,
            message: "Tenant onboarded successfully with admin account",
            adminUser: [
                userLoginId: adminUsername,
                firstName: adminFirstName,
                lastName: adminLastName,
                email: adminEmail,
                role: "HE_TENANT_ADMIN",
                temporaryPassword: adminPassword
            ],
            loginInstructions: "Logout as Platform Admin, then login with username '${adminUsername}' and the password you set. You will be redirected to the Tenant Portal."
        ]))
    }
    else if ("addAdmin".equals(action)) {
        // Add admin to an existing tenant (e.g. TANGLE_FLEET created before onboarding was complete)
        String tenantId = request.getParameter("tenantId")?.trim()?.toUpperCase()
        String adminUsername = request.getParameter("adminUsername")?.trim()?.toLowerCase()
        String adminPassword = request.getParameter("adminPassword")
        String adminFirstName = request.getParameter("adminFirstName")?.trim() ?: "Tenant"
        String adminLastName = request.getParameter("adminLastName")?.trim() ?: "Admin"

        if (!tenantId || !adminPassword) {
            response.setStatus(400)
            out.write(JsonOutput.toJson([error: "tenantId and adminPassword are required"]))
            return "error"
        }
        if (!adminUsername) adminUsername = tenantId.toLowerCase() + "_admin"

        GenericValue tenant = EntityQuery.use(delegator).from("Tenant").where("tenantId", tenantId).queryOne()
        if (tenant == null) {
            response.setStatus(404)
            out.write(JsonOutput.toJson([error: "Tenant not found: " + tenantId]))
            return "error"
        }

        GenericValue existingUser = EntityQuery.use(delegator).from("UserLogin").where("userLoginId", adminUsername).queryOne()
        if (existingUser != null) {
            def existingLink = EntityQuery.use(delegator)
                .from("HeTenantUser")
                .where("tenantId", tenantId, "userLoginId", adminUsername)
                .filterByDate()
                .queryFirst()

            if (existingLink || adminUsername == tenantId.toLowerCase() + "_admin") {
                def platformUser = getSystemUserLogin()
                def resetResult = dispatcher.runSync("updatePassword", [
                    userLoginId: adminUsername,
                    newPassword: adminPassword,
                    newPasswordVerify: adminPassword,
                    userLogin: platformUser
                ])
                if (ServiceUtil.isError(resetResult)) {
                    throw new Exception("Password reset failed: " + ServiceUtil.getErrorMessage(resetResult))
                }
                existingUser.refresh()
                existingUser.set("enabled", "Y")
                existingUser.set("successiveFailedLogins", 0L)
                existingUser.set("requirePasswordChange", "N")
                delegator.store(existingUser)

                Timestamp linkNow = new Timestamp(System.currentTimeMillis())
                if (!existingLink) {
                    delegator.create("HeTenantUser", [
                        heTenantUserId: delegator.getNextSeqId("HeTenantUser"),
                        tenantId: tenantId,
                        userLoginId: adminUsername,
                        partyId: existingUser.partyId,
                        roleType: "TENANT_ADMIN",
                        fromDate: linkNow
                    ])
                }
                def existingGroup = EntityQuery.use(delegator)
                    .from("UserLoginSecurityGroup")
                    .where("userLoginId", adminUsername, "groupId", "HE_TENANT_ADMIN")
                    .filterByDate()
                    .queryFirst()
                if (!existingGroup) {
                    delegator.create("UserLoginSecurityGroup", [
                        userLoginId: adminUsername,
                        groupId: "HE_TENANT_ADMIN",
                        fromDate: linkNow
                    ])
                }

                out.write(JsonOutput.toJson([
                    success: true,
                    tenantId: tenantId,
                    tenantName: tenant.tenantName,
                    message: "Admin account already existed — password has been reset to your new password",
                    adminUser: [
                        userLoginId: adminUsername,
                        role: "HE_TENANT_ADMIN",
                        temporaryPassword: adminPassword
                    ],
                    loginInstructions: "Logout and login with username '${adminUsername}' and the password you just entered."
                ]))
                return "success"
            }

            int suffix = 2
            String baseUsername = adminUsername
            while (EntityQuery.use(delegator).from("UserLogin").where("userLoginId", adminUsername).queryOne() != null) {
                adminUsername = baseUsername + suffix
                suffix++
            }
        }

        def userLogin = getSystemUserLogin()
        Timestamp now = new Timestamp(System.currentTimeMillis())

        def userResult = dispatcher.runSync("createPersonAndUserLogin", [
            userLoginId: adminUsername,
            currentPassword: adminPassword,
            currentPasswordVerify: adminPassword,
            firstName: adminFirstName,
            lastName: adminLastName,
            enabled: "Y",
            requirePasswordChange: "N",
            userLogin: userLogin
        ])
        if (ServiceUtil.isError(userResult)) {
            throw new Exception(ServiceUtil.getErrorMessage(userResult))
        }

        String adminPartyId = userResult.partyId ?: userResult.newUserLogin?.partyId

        delegator.create("UserLoginSecurityGroup", [
            userLoginId: adminUsername,
            groupId: "HE_TENANT_ADMIN",
            fromDate: now
        ])

        delegator.create("HeTenantUser", [
            heTenantUserId: delegator.getNextSeqId("HeTenantUser"),
            tenantId: tenantId,
            userLoginId: adminUsername,
            partyId: adminPartyId,
            roleType: "TENANT_ADMIN",
            fromDate: now
        ])

        out.write(JsonOutput.toJson([
            success: true,
            tenantId: tenantId,
            message: "Tenant admin account created for existing tenant",
            adminUser: [
                userLoginId: adminUsername,
                firstName: adminFirstName,
                lastName: adminLastName,
                role: "HE_TENANT_ADMIN",
                temporaryPassword: adminPassword
            ],
            loginInstructions: "Login with username '${adminUsername}' and your password at #/login"
        ]))
    }
    else if ("resetPassword".equals(action)) {
        String tenantId = request.getParameter("tenantId")?.trim()?.toUpperCase()
        String adminUsername = request.getParameter("adminUsername")?.trim()?.toLowerCase()
        String newPassword = request.getParameter("adminPassword") ?: request.getParameter("newPassword")

        if (!tenantId || !newPassword) {
            response.setStatus(400)
            out.write(JsonOutput.toJson([error: "tenantId and adminPassword (new password) are required"]))
            return "error"
        }

        GenericValue tenant = EntityQuery.use(delegator).from("Tenant").where("tenantId", tenantId).queryOne()
        if (tenant == null) {
            response.setStatus(404)
            out.write(JsonOutput.toJson([error: "Tenant not found: " + tenantId]))
            return "error"
        }

        // Find admin user for this tenant
        if (!adminUsername) {
            def tenantAdmin = EntityQuery.use(delegator)
                .from("HeTenantUser")
                .where("tenantId", tenantId, "roleType", "TENANT_ADMIN")
                .filterByDate()
                .queryFirst()
            if (tenantAdmin) {
                adminUsername = tenantAdmin.userLoginId
            } else {
                adminUsername = tenantId.toLowerCase() + "_admin"
            }
        }

        GenericValue targetUser = EntityQuery.use(delegator).from("UserLogin").where("userLoginId", adminUsername).queryOne()
        if (targetUser == null) {
            response.setStatus(404)
            out.write(JsonOutput.toJson([
                error: "Admin user not found: " + adminUsername,
                hint: "Use action=addAdmin to create a new admin account for this tenant"
            ]))
            return "error"
        }

        def userLogin = getSystemUserLogin()

        // Reset password via OFBiz service (system/admin user can do this)
        def resetResult = dispatcher.runSync("updatePassword", [
            userLoginId: adminUsername,
            newPassword: newPassword,
            newPasswordVerify: newPassword,
            userLogin: userLogin
        ])
        if (ServiceUtil.isError(resetResult)) {
            throw new Exception("Password reset failed: " + ServiceUtil.getErrorMessage(resetResult))
        }

        // Ensure account is enabled
        targetUser.refresh()
        targetUser.set("enabled", "Y")
        targetUser.set("successiveFailedLogins", 0L)
        targetUser.set("requirePasswordChange", "N")
        delegator.store(targetUser)

        // Ensure HE_TENANT_ADMIN security group exists
        Timestamp now = new Timestamp(System.currentTimeMillis())
        def existingGroup = EntityQuery.use(delegator)
            .from("UserLoginSecurityGroup")
            .where("userLoginId", adminUsername, "groupId", "HE_TENANT_ADMIN")
            .filterByDate()
            .queryFirst()
        if (!existingGroup) {
            delegator.create("UserLoginSecurityGroup", [
                userLoginId: adminUsername,
                groupId: "HE_TENANT_ADMIN",
                fromDate: now
            ])
        }

        // Ensure HeTenantUser mapping exists
        def existingLink = EntityQuery.use(delegator)
            .from("HeTenantUser")
            .where("tenantId", tenantId, "userLoginId", adminUsername)
            .filterByDate()
            .queryFirst()
        if (!existingLink) {
            delegator.create("HeTenantUser", [
                heTenantUserId: delegator.getNextSeqId("HeTenantUser"),
                tenantId: tenantId,
                userLoginId: adminUsername,
                partyId: targetUser.partyId,
                roleType: "TENANT_ADMIN",
                fromDate: now
            ])
        }

        out.write(JsonOutput.toJson([
            success: true,
            tenantId: tenantId,
            tenantName: tenant.tenantName,
            message: "Password reset successfully for tenant admin",
            adminUser: [
                userLoginId: adminUsername,
                role: "HE_TENANT_ADMIN",
                temporaryPassword: newPassword
            ],
            loginInstructions: "Logout and login with username '${adminUsername}' and the new password."
        ]))
    }
    else {
        response.setStatus(400)
        out.write(JsonOutput.toJson([error: "Invalid action. Use ?action=list, ?action=create, ?action=addAdmin, or ?action=resetPassword"]))
    }
} catch (Exception e) {
    response.setStatus(500)
    out.write(JsonOutput.toJson([error: e.getMessage()]))
}

return "success"
