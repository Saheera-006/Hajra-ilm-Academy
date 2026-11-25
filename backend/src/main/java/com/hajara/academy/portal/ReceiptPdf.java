package com.hajara.academy.portal;

import java.io.*;
import java.awt.Color;
import java.util.*;
import java.math.BigDecimal;
import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.*;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;

/** Shared receipt renderer for email and authenticated student downloads. */
final class ReceiptPdf {
    private static final Color NAVY = new Color(16,37,75), GOLD = new Color(201,164,92),
        INK = new Color(30,41,59), MUTED = new Color(85,99,119), PALE = new Color(241,245,249),
        GREEN = new Color(21,128,61), WHITE = Color.WHITE;
    private final PDPageContentStream c;
    private final PDFont font;
    private final PDFont bold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
    private ReceiptPdf(PDPageContentStream c, PDFont font) { this.c=c; this.font=font; }
    static byte[] render(Map<String,Object> r) throws IOException {
        try (var doc=new PDDocument(); var out=new ByteArrayOutputStream();
             var in=ReceiptPdf.class.getResourceAsStream("/certificate-font.ttf")) {
            if(in==null) throw new IOException("Receipt font missing");
            PDFont font=PDType0Font.load(doc,in);
            var page=new PDPage(PDRectangle.A4); doc.addPage(page);
            try(var c=new PDPageContentStream(doc,page)) {
                var p=new ReceiptPdf(c,font); p.draw(doc,r);
            }
            doc.save(out); return out.toByteArray();
        }
    }
    private void rect(float x,float y,float w,float h,Color color)throws IOException {
        c.setNonStrokingColor(color); c.addRect(x,y,w,h); c.fill();
    }
    private String safe(String s,PDFont f)throws IOException {
        var b=new StringBuilder();
        for(int cp:s.codePoints().toArray()) {
            String v=Character.isISOControl(cp)?" ":new String(Character.toChars(cp));
            try { f.encode(v); b.append(v); } catch(IllegalArgumentException ex) { b.append('?'); }
        }
        return b.toString();
    }
    private float width(String s,PDFont f,float size)throws IOException {return f.getStringWidth(safe(s,f))*size/1000;}
    private void text(float x,float y,String s,PDFont f,float size,Color color)throws IOException {
        c.beginText(); c.setFont(f,size); c.setNonStrokingColor(color); c.newLineAtOffset(x,y); c.showText(safe(s,f)); c.endText();
    }
    private void right(float x,float y,String s,PDFont f,float size,Color color)throws IOException {text(x-width(s,f,size),y,s,f,size,color);}
    private float wrap(float x,float y,String s,float max,float size)throws IOException {
        String line="";
        for(String word:s.replaceAll("\\s+"," ").split(" ")) {
            String next=line.isEmpty()?word:line+" "+word;
            if(width(next,font,size)>max && !line.isEmpty()){text(x,y,line,font,size,INK);y-=size+3;line="";}
            for(int cp:word.codePoints().toArray()) {
                String ch=new String(Character.toChars(cp));
                if(width(line+ch,font,size)>max && !line.isEmpty()){text(x,y,line,font,size,INK);y-=size+3;line="";}
                line+=ch;
            }
            line+=" ";
        }
        if(!line.isBlank()){text(x,y,line.stripTrailing(),font,size,INK);y-=size+3;}
        return y;
    }
    private static String val(Map<String,Object> r,String k){return Objects.toString(r.get(k),"—");}
    private static long amount(Map<String,Object> r,String k){return r.get(k) instanceof Number n?n.longValue():0;}
    private static String money(long n){return "₹"+String.format(Locale.ENGLISH,"%,.2f",BigDecimal.valueOf(n,2));}
    private void draw(PDDocument doc,Map<String,Object> r)throws IOException {
        long paid=amount(r,"amount_paise"), refund=amount(r,"refunded_paise");
        rect(36,704,523,102,NAVY); rect(36,700,523,4,GOLD);
        try(var logo=ReceiptPdf.class.getResourceAsStream("/certificate-logo.png")){
            if(logo!=null){rect(48,720,70,70,WHITE);c.drawImage(PDImageXObject.createFromByteArray(doc,logo.readAllBytes(),"academy-logo"),50,722,66,66);}
        }
        text(132,766,"HAJARA ILM ACADEMY",bold,20,WHITE);
        text(132,742,"PAYMENT RECEIPT",bold,12,GOLD);
        text(36,675,"RECEIPT NUMBER",bold,9,MUTED);
        text(36,657,"HIA-RCP-"+val(r,"payment_id"),font,11,NAVY);
        rect(441,650,118,30,refund>0?PALE:new Color(220,252,231));
        String status=refund>=paid&&refund>0?"REFUNDED":refund>0?"PART REFUNDED":"PAID";
        right(550,661,status,bold,10,refund>0?INK:GREEN);
        rect(36,635,523,1,GOLD);
        text(36,614,"BILLED TO",bold,10,NAVY);text(310,614,"PAYMENT DETAILS",bold,10,NAVY);
        float a=wrap(36,595,val(r,"full_name"),250,11);
        a=wrap(36,a-3,"Student ID: "+val(r,"student_id"),250,10);
        a=wrap(36,a-3,val(r,"email"),250,10);
        float b=wrap(310,595,"Gateway: Razorpay",249,10);
        b=wrap(310,b-3,"Paid at: "+val(r,"paid_at"),249,10);
        b=wrap(310,b-3,"Payment ID: "+val(r,"payment_id"),249,10);
        b=wrap(310,b-3,"Order ID: "+val(r,"order_id"),249,10);
        float y=Math.min(a,b)-16;
        rect(36,y-28,523,28,NAVY);text(48,y-18,"DESCRIPTION",bold,10,WHITE);right(547,y-18,"AMOUNT",bold,10,WHITE);
        rect(36,y-82,523,54,PALE);text(48,y-48,"Islamic Learning Programme",bold,12,NAVY);
        text(48,y-65,"Six-month programme enrollment",font,10,MUTED);right(547,y-52,money(paid),font,12,INK);
        y-=106;
        text(310,y,"Total paid",bold,12,NAVY);right(547,y,money(paid),font,16,NAVY);
        if(refund>0){y-=23;text(310,y,"Refunded",font,10,MUTED);right(547,y,money(refund),font,11,INK);y-=20;text(310,y,"Net paid",bold,10,NAVY);right(547,y,money(paid-refund),font,11,NAVY);}
        else {y-=23;text(310,y,"Balance due",font,10,GREEN);right(547,y,money(0),font,11,GREEN);}
        rect(36,86,523,1,GOLD);
        text(36,66,"Jazakallahu Khairan!",bold,11,NAVY);
        text(36,50,"Thank you for enrolling with Hajara Ilm Academy.",font,9,MUTED);
        text(36,35,"Computer-generated payment receipt. Not a GST tax invoice.",font,8,MUTED);
    }
}
