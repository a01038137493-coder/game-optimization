import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { orderId, status } = req.body;
    console.log('[admin-update-order] ===== UPDATE 시작 =====');
    console.log('[admin-update-order] 파라미터:', { orderId, type: typeof orderId, status });

    if (!orderId || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // orderId를 명시적으로 정수 변환
    const orderIdInt = parseInt(orderId, 10);
    if (isNaN(orderIdInt)) {
      console.error('[admin-update-order] orderId는 유효한 정수가 아님:', orderId);
      return res.status(400).json({ error: 'Invalid orderId format' });
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    // Step 1: 해당 주문 존재 여부 확인
    console.log('[admin-update-order] Step 1: 주문 조회 (id = ' + orderIdInt + ')');
    const { data: orders, error: queryError } = await supabase
      .from('orders')
      .select('id, order_id, status, created_at')
      .eq('id', orderIdInt);

    if (queryError) {
      console.error('[admin-update-order] 주문 조회 실패:', queryError);
      return res.status(500).json({ error: 'Database error', details: queryError.message });
    }

    if (!orders || orders.length === 0) {
      console.warn('[admin-update-order] 주문이 없음 (id=' + orderIdInt + ')');
      return res.status(404).json({ error: 'Order not found' });
    }

    const existingOrder = orders[0];
    if (orders.length > 1) {
      console.warn('[admin-update-order] ⚠️ 경고: 중복된 id가 존재함 (개수=' + orders.length + ')');
    }

    console.log('[admin-update-order] ✅ 기존 주문 발견:', {
      id: existingOrder.id,
      order_id: existingOrder.order_id,
      current_status: existingOrder.status
    });

    // Step 2: 상태 업데이트
    const updateData = { status, updated_at: new Date().toISOString() };
    console.log('[admin-update-order] Step 2: UPDATE 실행');
    console.log('[admin-update-order] UPDATE 데이터:', updateData);

    const { data: updatedOrders, error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderIdInt)
      .select();

    console.log('[admin-update-order] UPDATE 반환값:', {
      rows: updatedOrders?.length || 0,
      error: updateError?.message || 'none'
    });

    if (updateError) {
      console.error('[admin-update-order] UPDATE 실패:', updateError);
      return res.status(500).json({ error: 'Failed to update order', details: updateError.message });
    }

    if (!updatedOrders || updatedOrders.length === 0) {
      console.warn('[admin-update-order] ⚠️ 업데이트 결과 없음');
      return res.status(400).json({ error: 'Update failed', details: 'No rows were updated' });
    }

    const updated = updatedOrders[0];
    console.log('[admin-update-order] ✅ UPDATE 성공:', {
      id: updated.id,
      order_id: updated.order_id,
      old_status: existingOrder.status,
      new_status: updated.status
    });

    console.log('[admin-update-order] ===== UPDATE 완료 =====');

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      orderId: updated.id,
      order_id: updated.order_id,
      status: updated.status
    });

  } catch (err) {
    console.error('[admin-update-order] Exception:', err.message);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
}
