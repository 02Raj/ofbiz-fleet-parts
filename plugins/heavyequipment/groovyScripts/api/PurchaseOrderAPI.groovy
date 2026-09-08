import groovy.json.JsonBuilder
import org.apache.ofbiz.entity.GenericValue
import org.apache.ofbiz.entity.util.EntityQuery
import org.apache.ofbiz.service.ServiceUtil
import java.sql.Timestamp

response.setContentType("application/json")
def out = response.getWriter()

try {
    def userLogin = request.getSession().getAttribute("userLogin") ?: EntityQuery.use(delegator).from("UserLogin").where("userLoginId", "system").queryOne()
    
    // For MVP, we will take supplierId, facilityId, and a list of items (productId, quantity, unitPrice)
    String supplierId = request.getParameter("supplierId")
    String facilityId = request.getParameter("facilityId")
    String productId = request.getParameter("productId")
    String quantityStr = request.getParameter("quantity")
    
    if (!supplierId || !facilityId || !productId || !quantityStr) {
        response.setStatus(400)
        out.print(new JsonBuilder([error: "Missing required parameters (supplierId, facilityId, productId, quantity)"]).toString())
        return "error"
    }

    BigDecimal quantity = new BigDecimal(quantityStr)
    
    // Create OrderHeader
    String orderId = delegator.getNextSeqId("OrderHeader")
    GenericValue orderHeader = delegator.makeValue("OrderHeader", [
        orderId: orderId,
        orderTypeId: "PURCHASE_ORDER",
        orderDate: new Timestamp(System.currentTimeMillis()),
        statusId: "ORDER_APPROVED", // Auto-approved as requested by user
        originFacilityId: facilityId,
        currencyUom: "USD"
    ])
    orderHeader.create()

    // Create OrderRole for Supplier
    delegator.create("OrderRole", [orderId: orderId, partyId: supplierId, roleTypeId: "SUPPLIER_AGENT"])

    // Create OrderItem
    String orderItemSeqId = "00001"
    GenericValue orderItem = delegator.makeValue("OrderItem", [
        orderId: orderId,
        orderItemSeqId: orderItemSeqId,
        orderItemTypeId: "PRODUCT_ORDER_ITEM",
        productId: productId,
        quantity: quantity,
        unitPrice: BigDecimal.ZERO, // MVP placeholder
        statusId: "ITEM_APPROVED"
    ])
    orderItem.create()
    
    // Create OrderStatus record
    delegator.create("OrderStatus", [
        orderStatusId: delegator.getNextSeqId("OrderStatus"),
        statusId: "ORDER_APPROVED",
        orderId: orderId,
        orderItemSeqId: orderItemSeqId,
        statusDatetime: new Timestamp(System.currentTimeMillis()),
        statusUserLogin: userLogin.userLoginId
    ])

    out.print(new JsonBuilder([
        success: true,
        message: "Purchase Order Created",
        orderId: orderId,
        status: "APPROVED"
    ]).toString())
    return "success"

} catch (Exception e) {
    response.setStatus(500)
    out.print(new JsonBuilder([error: e.getMessage()]).toString())
    return "error"
}
