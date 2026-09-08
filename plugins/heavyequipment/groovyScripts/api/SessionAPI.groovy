import org.apache.ofbiz.entity.GenericValue
import org.apache.ofbiz.entity.util.EntityQuery
import groovy.json.JsonBuilder

response.setContentType("application/json")
response.setCharacterEncoding("UTF-8")
def out = response.getWriter()

try {
    String action = request.getParameter("action")

    if ("logout".equals(action)) {
        // Invalidate session
        request.getSession().invalidate()
        out.print(new JsonBuilder([success: true, message: "Logged out successfully"]).toString())
        return "success"
    }

    // Default action: check session
    GenericValue userLogin = (GenericValue) request.getSession().getAttribute("userLogin")

    if (userLogin == null) {
        out.print(new JsonBuilder([
            authenticated: false
        ]).toString())
        return "success"
    }

    String userLoginId = userLogin.getString("userLoginId")
    String partyId = userLogin.getString("partyId")

    // Fetch roles
    List<GenericValue> securityGroups = EntityQuery.use(delegator)
        .from("UserLoginSecurityGroup")
        .where("userLoginId", userLoginId)
        .filterByDate()
        .queryList()

    def roles = securityGroups.collect { it.getString("groupId") }

    // Fetch display name
    String displayName = userLoginId
    if (partyId) {
        GenericValue person = EntityQuery.use(delegator)
            .from("Person")
            .where("partyId", partyId)
            .queryOne()
        if (person) {
            displayName = "${person.getString('firstName') ?: ''} ${person.getString('lastName') ?: ''}".trim()
        }
        if (!displayName || displayName == userLoginId) {
            GenericValue partyGroup = EntityQuery.use(delegator)
                .from("PartyGroup")
                .where("partyId", partyId)
                .queryOne()
            if (partyGroup) {
                displayName = partyGroup.getString("groupName") ?: userLoginId
            }
        }
    }

    boolean isPlatformAdmin = roles.contains("SUPER") || roles.contains("FULLADMIN") || roles.contains("BIZADMIN")

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
        authenticated: true,
        userLoginId: userLoginId,
        partyId: partyId,
        displayName: displayName,
        roles: roles,
        isPlatformAdmin: isPlatformAdmin,
        tenantId: tenantId,
        tenantName: tenantName
    ]).toString())
    return "success"

} catch (Exception e) {
    response.setStatus(500)
    out.print(new JsonBuilder([success: false, error: e.getMessage()]).toString())
    return "error"
}
