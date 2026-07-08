import { NextRequest, NextResponse } from 'next/server';
import { supabaseMarketing } from '@/lib/supabaseMarketing';
import { verifyAdminOrMarketing } from '@/lib/adminAuth';

// GET & POST & PUT cho /api/marketing/crm
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminOrMarketing(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const { searchParams } = request.nextUrl;
    const type = searchParams.get('type');             // 'all', 'inbox', 'comment'
    const status = searchParams.get('status');         // 'all', 'pending', 'processing', 'completed', 'ignored'
    const hasPhone = searchParams.get('has_phone');   // 'all', 'true', 'false'
    const sync = searchParams.get('sync') === 'true'; // Kích hoạt đồng bộ
    const convId = searchParams.get('conversation_id'); // Lấy chi tiết tin nhắn của 1 hội thoại

    // 1. Nếu cần lấy chi tiết tin nhắn của 1 cuộc hội thoại cụ thể
    if (convId) {
      const { data: messages, error } = await supabaseMarketing
        .from('fb_messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_time', { ascending: true });

      if (error) throw error;
      return NextResponse.json({ messages });
    }

    // 2. Kích hoạt đồng bộ tin nhắn/bình luận từ Facebook Page API (hoặc Mock nếu chưa cấu hình)
    if (sync) {
      // Đọc cấu hình từ database
      const { data: settingsData } = await supabaseMarketing
        .from('settings')
        .select('*');

      const settings: Record<string, string> = {};
      settingsData?.forEach(item => {
        settings[item.key] = item.value;
      });

      const pageAccessToken = settings['fb_page_access_token'];
      const pageId = settings['fb_page_id'];

      const isMock = !pageAccessToken || !pageId || pageAccessToken.includes('...') || pageAccessToken.startsWith('placeholder');

      if (isMock) {
        await handleMockCrmSync();
      } else {
        await handleRealCrmSync(pageId, pageAccessToken);
      }
    }

    // 3. Lấy danh sách hội thoại
    let query = supabaseMarketing
      .from('fb_conversations')
      .select('*')
      .order('updated_at', { ascending: false });

    if (type && type !== 'all') {
      query = query.eq('type', type);
    }
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (hasPhone === 'true') {
      query = query.eq('has_phone', true);
    } else if (hasPhone === 'false') {
      query = query.eq('has_phone', false);
    }

    const { data: conversations, error: convErr } = await query;
    if (convErr) throw convErr;

    return NextResponse.json({ conversations });

  } catch (error: any) {
    console.error('[API Marketing CRM GET Error]', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

// POST /api/marketing/crm - Gửi tin nhắn trả lời khách hàng
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminOrMarketing(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const body = await request.json();
    const { conversation_id, fb_conversation_id, type, message_text } = body;

    if (!conversation_id || !fb_conversation_id || !message_text) {
      return NextResponse.json({ error: 'Thiếu thông tin hội thoại hoặc nội dung tin nhắn' }, { status: 400 });
    }

    // Kiểm tra cấu hình Facebook Page Token để xác định chế độ gửi thật hay giả lập
    const { data: tokenItem } = await supabaseMarketing
      .from('settings')
      .select('value')
      .eq('key', 'fb_page_access_token')
      .maybeSingle();

    const isMock = !tokenItem || tokenItem.value.includes('...') || tokenItem.value.startsWith('placeholder');

    // Lưu tin nhắn gửi đi của nhân viên vào DB (của chúng ta)
    const { data: newMessage, error: msgErr } = await supabaseMarketing
      .from('fb_messages')
      .insert({
        conversation_id,
        fb_message_id: `msg_sent_${Date.now()}`,
        sender_name: auth.user?.name || 'Xưởng in PrinK Tech',
        sender_id: 'page_admin_id',
        message_text,
        created_time: new Date().toISOString()
      })
      .select()
      .single();

    if (msgErr) throw msgErr;

    // Cập nhật last_message của hội thoại
    await supabaseMarketing
      .from('fb_conversations')
      .update({
        last_message: message_text,
        status: 'processing', // Chuyển sang đang xử lý khi nhân viên đã phản hồi
        updated_at: new Date().toISOString()
      })
      .eq('id', conversation_id);

    if (!isMock) {
      // -------------------------------------------------------------
      // GỬI TIN NHẮN THẬT QUA FACEBOOK API
      // -------------------------------------------------------------
      if (type === 'inbox') {
        const pageAccessToken = tokenItem.value;
        const url = `https://graph.facebook.com/v20.0/${fb_conversation_id}/messages`;
        
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: JSON.stringify({ text: message_text }),
            access_token: pageAccessToken
          })
        });
      } else {
        // Gửi trả lời comment trên Facebook
        const pageAccessToken = tokenItem.value;
        const url = `https://graph.facebook.com/v20.0/${fb_conversation_id}/comments`;
        
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: message_text,
            access_token: pageAccessToken
          })
        });
      }
    } else {
      // CHẾ ĐỘ MOCK: Trả lời tự động giả lập của khách sau 2 giây để giao diện sinh động
      setTimeout(async () => {
        const customerReplies = [
          'Dạ vâng shop, shop báo giá sớm cho mình nhé.',
          'Ok shop, thiết kế rồi gửi mẫu qua Zalo cho mình check trước nha.',
          'Mình cần gấp trong tuần này có kịp giao về Hải Phòng không ạ?',
          'Cảm ơn shop nhé, để mình xem lại kích thước rồi nhắn lại.'
        ];
        const randomReply = customerReplies[Math.floor(Math.random() * customerReplies.length)];

        // Đọc lại tên khách hàng
        const { data: conv } = await supabaseMarketing
          .from('fb_conversations')
          .select('customer_name, customer_fb_id')
          .eq('id', conversation_id)
          .single();

        if (conv) {
          await supabaseMarketing
            .from('fb_messages')
            .insert({
              conversation_id,
              fb_message_id: `msg_received_reply_${Date.now()}`,
              sender_name: conv.customer_name,
              sender_id: conv.customer_fb_id || 'customer_mock_id',
              message_text: randomReply,
              created_time: new Date().toISOString()
            });

          await supabaseMarketing
            .from('fb_conversations')
            .update({
              last_message: randomReply,
              updated_at: new Date().toISOString()
            })
            .eq('id', conversation_id);
        }
      }, 2000);
    }

    return NextResponse.json({ success: true, message: newMessage });

  } catch (error: any) {
    console.error('[API Marketing CRM POST Error]', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

// PUT /api/marketing/crm - Cập nhật trạng thái hội thoại hoặc số điện thoại chốt đơn
export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAdminOrMarketing(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const body = await request.json();
    const { id, status, phone_number, has_phone } = body;

    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID hội thoại cần cập nhật' }, { status: 400 });
    }

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (phone_number !== undefined) updateData.phone_number = phone_number;
    if (has_phone !== undefined) updateData.has_phone = has_phone;
    updateData.updated_at = new Date().toISOString();

    const { data: conversation, error } = await supabaseMarketing
      .from('fb_conversations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, conversation });
  } catch (error: any) {
    console.error('[API Marketing CRM PUT Error]', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

// -------------------------------------------------------------
// ĐỒNG BỘ TIN NHẮN THẬT TỪ FACEBOOK PAGE API
// -------------------------------------------------------------
async function handleRealCrmSync(pageId: string, pageAccessToken: string) {
  // Lấy các cuộc trò chuyện Inbox gần nhất từ Page
  const inboxUrl = `https://graph.facebook.com/v20.0/${pageId}/conversations` +
    `?fields=id,participants,updated_time,unread_count,messages.limit(20){id,message,from,created_time}` +
    `&access_token=${pageAccessToken}` +
    `&limit=50`;

  const res = await fetch(inboxUrl);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Không thể đồng bộ tin nhắn từ Facebook');
  }

  const data = await res.json();
  const fbConvs = data.data || [];

  for (const fbc of fbConvs) {
    const fbConvId = fbc.id;
    const participants = fbc.participants?.data || [];
    // Lấy thông tin khách hàng (người không phải là Page)
    const customer = participants.find((p: any) => p.id !== pageId) || { name: 'Khách hàng Facebook', id: 'unknown' };
    
    const messages = fbc.messages?.data || [];
    const lastMsgObj = messages[0] || { message: '', created_time: new Date().toISOString() };
    const lastMessageText = lastMsgObj.message || '';

    // Hàm tự quét và trích xuất số điện thoại
    const phoneInfo = extractPhone(lastMessageText);

    // 1. Tạo/Cập nhật Conversation
    const { data: conversation, error: convErr } = await supabaseMarketing
      .from('fb_conversations')
      .upsert({
        fb_conversation_id: fbConvId,
        type: 'inbox',
        customer_name: customer.name,
        customer_fb_id: customer.id,
        last_message: lastMessageText,
        has_phone: phoneInfo.hasPhone,
        phone_number: phoneInfo.phone,
        status: 'pending',
        updated_at: new Date(fbc.updated_time).toISOString()
      }, {
        onConflict: 'fb_conversation_id'
      })
      .select()
      .single();

    if (convErr) continue;

    // 2. Đồng bộ các tin nhắn con trong cuộc trò chuyện
    const msgsToUpsert = messages.map((m: any) => {
      return {
        conversation_id: conversation.id,
        fb_message_id: m.id,
        sender_name: m.from?.name || 'Khách',
        sender_id: m.from?.id || 'unknown',
        message_text: m.message || '',
        created_time: new Date(m.created_time).toISOString()
      };
    });

    if (msgsToUpsert.length > 0) {
      await supabaseMarketing
        .from('fb_messages')
        .upsert(msgsToUpsert, { onConflict: 'fb_message_id' });
    }
  }
}

// -------------------------------------------------------------
// ĐỒNG BỘ CRM GIẢ LẬP (MOCK DATA)
// -------------------------------------------------------------
async function handleMockCrmSync() {
  const mockConversations = [
    {
      fb_conversation_id: 'mock_conv_1',
      type: 'inbox',
      customer_name: 'Nguyễn Minh Hải',
      customer_fb_id: 'mock_user_1',
      last_message: 'In tem UV DTF nổi 3D dán ly cốc sứ có bền không shop? Cho mình báo giá 200 tem nhé. Sđt: 0984123456',
      status: 'pending',
      updated_at: new Date().toISOString(),
      messages: [
        { id: 'm1_1', sender_name: 'Nguyễn Minh Hải', sender_id: 'mock_user_1', text: 'Chào shop, mình cần đặt in tem nhãn.', time: new Date(Date.now() - 3600000 * 2).toISOString() },
        { id: 'm1_2', sender_name: 'Xưởng in PrinK Tech', sender_id: 'page_admin_id', text: 'Dạ chào anh, shop em chuyên in UV DTF thường và nổi 3D ạ. Anh muốn in loại tem nào và số lượng bao nhiêu ạ?', time: new Date(Date.now() - 3600000 * 1.9).toISOString() },
        { id: 'm1_3', sender_name: 'Nguyễn Minh Hải', sender_id: 'mock_user_1', text: 'In tem UV DTF nổi 3D dán ly cốc sứ có bền không shop? Cho mình báo giá 200 tem nhé. Sđt: 0984123456', time: new Date(Date.now() - 60000).toISOString() }
      ]
    },
    {
      fb_conversation_id: 'mock_conv_2',
      type: 'comment',
      customer_name: 'Trần Thị Lan Anh',
      customer_fb_id: 'mock_user_2',
      fb_post_id: 'post_mock_1',
      fb_post_title: 'Bài viết quảng cáo: Công nghệ in UV DTF nổi 3D bóng kính gương bám dính siêu tốt',
      last_message: 'Tem đẹp quá shop ơi, in bế sẵn khổ A3 giá bao nhiêu ạ? Ib mình nha. Số mình 0382229988',
      status: 'pending',
      updated_at: new Date(Date.now() - 600000).toISOString(),
      messages: [
        { id: 'm2_1', sender_name: 'Trần Thị Lan Anh', sender_id: 'mock_user_2', text: 'Tem đẹp quá shop ơi, in bế sẵn khổ A3 giá bao nhiêu ạ? Ib mình nha. Số mình 0382229988', time: new Date(Date.now() - 600000).toISOString() }
      ]
    },
    {
      fb_conversation_id: 'mock_conv_3',
      type: 'inbox',
      customer_name: 'Hoàng Nam',
      customer_fb_id: 'mock_user_3',
      last_message: 'Xưởng mình ở đâu thế ạ? Có nhận in số lượng ít tầm 10-20 chiếc không?',
      status: 'pending',
      updated_at: new Date(Date.now() - 7200000).toISOString(),
      messages: [
        { id: 'm3_1', sender_name: 'Hoàng Nam', sender_id: 'mock_user_3', text: 'Xưởng mình ở đâu thế ạ? Có nhận in số lượng ít tầm 10-20 chiếc không?', time: new Date(Date.now() - 7200000).toISOString() }
      ]
    },
    {
      fb_conversation_id: 'mock_conv_4',
      type: 'comment',
      customer_name: 'Phạm Văn Đức',
      customer_fb_id: 'mock_user_4',
      fb_post_id: 'post_mock_2',
      fb_post_title: 'Sản phẩm mới: Tem decal dán bình giữ nhiệt chống trầy xước nước ấm',
      last_message: 'Có ship COD ngoại tỉnh không shop? Mình ở Đà Nẵng cần in nhãn thương hiệu sỉ',
      status: 'completed',
      updated_at: new Date(Date.now() - 86400000).toISOString(),
      messages: [
        { id: 'm4_1', sender_name: 'Phạm Văn Đức', sender_id: 'mock_user_4', text: 'Có ship COD ngoại tỉnh không shop? Mình ở Đà Nẵng cần in nhãn thương hiệu sỉ', time: new Date(Date.now() - 86400000).toISOString() },
        { id: 'm4_2', sender_name: 'Xưởng in PrinK Tech', sender_id: 'page_admin_id', text: 'Dạ bên em ship COD toàn quốc anh nhé! Đã inbox anh tư vấn bảng giá sỉ theo mét dài ạ.', time: new Date(Date.now() - 86000000).toISOString() }
      ]
    }
  ];

  for (const mc of mockConversations) {
    const phoneInfo = extractPhone(mc.last_message);
    
    // Upsert conversation
    const { data: conversation, error: convErr } = await supabaseMarketing
      .from('fb_conversations')
      .upsert({
        fb_conversation_id: mc.fb_conversation_id,
        type: mc.type,
        customer_name: mc.customer_name,
        customer_fb_id: mc.customer_fb_id,
        last_message: mc.last_message,
        has_phone: phoneInfo.hasPhone,
        phone_number: phoneInfo.phone,
        status: mc.status,
        fb_post_id: mc.fb_post_id || null,
        fb_post_title: mc.fb_post_title || null,
        updated_at: mc.updated_at
      }, {
        onConflict: 'fb_conversation_id'
      })
      .select()
      .single();

    if (convErr) continue;

    // Upsert messages
    const msgsToUpsert = mc.messages.map((m: any) => {
      return {
        conversation_id: conversation.id,
        fb_message_id: m.id,
        sender_name: m.sender_name,
        sender_id: m.sender_id,
        message_text: m.text,
        created_time: m.time
      };
    });

    await supabaseMarketing
      .from('fb_messages')
      .upsert(msgsToUpsert, { onConflict: 'fb_message_id' });
  }
}

// -------------------------------------------------------------
// TIỆN ÍCH QUÉT TRÍCH XUẤT SỐ ĐIỆN THOẠI BẰNG REGEX
// -------------------------------------------------------------
function extractPhone(text: string): { hasPhone: boolean; phone: string | null } {
  if (!text) return { hasPhone: false, phone: null };
  
  // Regex quét sđt Việt Nam (bao gồm cả trường hợp viết cách nhau, dấu chấm, +84, o9xx thay thế chữ o)
  const cleanedText = text.toLowerCase().replace(/o/g, '0').replace(/[^0-9+]/g, '');
  
  // Quét định dạng số điện thoại dài từ 9 đến 11 chữ số
  const phoneRegex = /(\+84|0)(3|5|7|8|9|1[2689])[0-9]{7,8}/g;
  const match = cleanedText.match(phoneRegex);
  
  if (match && match.length > 0) {
    // Lấy số điện thoại đầu tiên tìm thấy
    let phone = match[0];
    // Chuẩn hóa +84 thành 0
    if (phone.startsWith('+84')) {
      phone = '0' + phone.slice(3);
    }
    return { hasPhone: true, phone };
  }

  // Quét regex thông thường dự phòng
  const rawPhoneRegex = /(0[3|5|7|8|9][0-9]{8})|(01[2|6|8|9][0-9]{8})/g;
  const rawMatch = text.replace(/\s+/g, '').match(rawPhoneRegex);
  if (rawMatch && rawMatch.length > 0) {
    return { hasPhone: true, phone: rawMatch[0] };
  }
  
  return { hasPhone: false, phone: null };
}
