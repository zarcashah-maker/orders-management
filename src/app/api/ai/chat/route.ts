import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function POST(req: NextRequest) {
  try {
    const { messages, orderContext } = await req.json()

    const systemPrompt = `أنت مساعد ذكي متخصص في إدارة طلبات الإنتاج والمصانع. 
أجب دائماً باللغة العربية بشكل مختصر ومفيد.
أنت تساعد مدير في متابعة الطلبات مع المصانع.

معلومات الطلب الحالي:
- رقم الطلب: ${orderContext.order_number}
- العنوان: ${orderContext.title}
- الوصف: ${orderContext.description || 'لا يوجد'}
- الحالة: ${orderContext.status}
- المصنع: ${orderContext.factory}
- الكمية: ${orderContext.quantity || 'غير محدد'}
- تاريخ التسليم: ${orderContext.due_date || 'غير محدد'}
- الملاحظات: ${orderContext.notes || 'لا يوجد'}
- تاريخ الإنشاء: ${orderContext.created_at}

قدم إجابات عملية ومفيدة تساعد في متابعة وإدارة هذا الطلب.`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    })

    const reply = response.content[0].type === 'text' ? response.content[0].text : ''

    return NextResponse.json({ reply })
  } catch (error) {
    console.error('AI error:', error)
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 500 })
  }
}
