import org.apache.ofbiz.webapp.control.LoginWorker
import org.apache.ofbiz.entity.GenericValue
import org.apache.ofbiz.entity.util.EntityQuery
import org.apache.ofbiz.service.ServiceUtil
import org.apache.ofbiz.base.util.UtilMisc
import groovy.json.JsonBuilder

response.setContentType("application/json")
response.setCharacterEncoding("UTF-8")
def out = response.getWriter()

try {
    String username = request.getParameter("USERNAME")?.trim()?.toLowerCase()
    String password = request.getParameter("PASSWORD")

    if (!username || !password) {
        response.setStatus(400)
        out.print(new JsonBuilder([success: false, error: "USERNAME and PASSWORD are required"]).toString())
        return "error"
    }

    request.setAttribute("USERNAME", username)
    request.setAttribute("PASSWORD", password)

    // Step 1: Authenticate via userLogin service (validates password)
    def loginServiceResult = dispatcher.runSync("userLogin", UtilMisc.toMap(
        "login.username", username,
        "login.password", password,
        "locale", request.getLocale(),
        "request", request
    ))

    if (ServiceUtil.isError(loginServiceResult)) {
        response.setStatus(401)
        out.print(new JsonBuilder([
            success: false,
            error: "Invalid username or password",
            detail: ServiceUtil.getErrorMessage(loginServiceResult)
        ]).toString())
        return "error"
    }

    GenericValue userLogin = loginServiceResult.userLogin
    if (userLogin == null) {
        response.setStatus(401)
        out.print(new JsonBuilder([success: false, error: "Invalid username or password"]).toString())
        return "error"
    }

    Map userLoginSession = loginServiceResult.userLoginSession as Map

    String userLoginId = userLogin.getString("userLoginId")
    String partyId = userLogin.getString("partyId")

    List<GenericValue> securityGroups = EntityQuery.use(delegator)
        .from("UserLoginSecurityGroup")
        .where("userLoginId", userLoginId)
        .filterByDate()
        .queryList()

    def roles = securityGroups.collect { it.getString("groupId") }

    boolean isPlatformAdmin = roles.contains("SUPER") || roles.contains("FULLADMIN") || roles.contains("BIZADMIN")
    boolean hasHeavyEquipmentAccess = isPlatformAdmin || roles.any { it.startsWith("HE_") }

    if (!hasHeavyEquipmentAccess) {
        response.setStatus(403)
        out.print(new JsonBuilder([
            success: false,
            error: "This account does not have access to the Heavy Equipment platform"
        ]).toString())
        return "error"
    }

    // Step 2: Establish session (bypass webapp OFBTOOLS gate for tenant users)
    LoginWorker.doBasicLogin(userLogin, request, response)
    if (userLoginSession != null) {
        request.getSession().setAttribute("userLoginSession", userLoginSession)
    }
    request.setAttribute("_LOGIN_PASSED_", "TRUE")

    String displayName = userLoginId
    if (partyId) {
        GenericValue person = EntityQuery.use(delegator).from("Person").where("partyId", partyId).queryOne()
        if (person) {
            displayName = "${person.getString('firstName') ?: ''} ${person.getString('lastName') ?: ''}".trim()
        }
    }

    String tenantId = null
    String tenantName = null
    if (!isPlatformAdmin) {
        def tenantUser = EntityQuery.use(delegator)
            .from("HeTenantUser")
            .where("userLoginId", userLoginId)
            .filterByDate()
            .queryFirst()
        if (tenantUser) {
            tenantId = tenantUser.tenantId
            GenericValue tenant = EntityQuery.use(delegator).from("Tenant").where("tenantId", tenantId).queryOne()
            tenantName = tenant?.tenantName
        }
    }

    out.print(new JsonBuilder([
        success: true,
        userLoginId: userLoginId,
        partyId: partyId,
        displayName: displayName,
        roles: roles,
        isPlatformAdmin: isPlatformAdmin,
        hasHeavyEquipmentAccess: hasHeavyEquipmentAccess,
        tenantId: tenantId,
        tenantName: tenantName,
        sessionId: request.getSession().getId()
    ]).toString())
    return "success"

} catch (Exception e) {
    response.setStatus(500)
    out.print(new JsonBuilder([success: false, error: e.getMessage()]).toString())
    return "error"
}
