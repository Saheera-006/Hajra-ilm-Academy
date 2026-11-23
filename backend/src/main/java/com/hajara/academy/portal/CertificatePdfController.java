package com.hajara.academy.portal;
import java.io.*;
import java.util.*;
import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;
import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.graphics.image.LosslessFactory;
import org.apache.pdfbox.pdmodel.font.*;
import com.google.zxing.*;
import com.google.zxing.common.BitMatrix;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
@RestController @RequestMapping("/api/portal")
public class CertificatePdfController {
 private final JdbcTemplate jdbc;private final CurrentUser current;
 @Value("${app.public-url:http://localhost:5173}") private String publicUrl;
 public CertificatePdfController(JdbcTemplate j,CurrentUser c){jdbc=j;current=c;}
 @GetMapping("/my-certificates/{id}/pdf")
 public ResponseEntity<byte[]> download(Authentication auth,@PathVariable Long id)throws IOException{
  Long uid=current.require(auth).id;
  var rows=jdbc.queryForList("SELECT c.certificate_code,c.issued_at,COALESCE(c.display_name,u.full_name) AS full_name,u.student_number,c.completion_date FROM academy_certificates c JOIN portal_enrollments e ON e.id=c.enrollment_id JOIN portal_users u ON u.id=e.user_id WHERE c.id=? AND e.user_id=?",id,uid);
  if(rows.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Certificate not found");
  var row=rows.get(0);String name=Objects.toString(row.get("full_name"),"");String date=Objects.toString(row.get("completion_date"),row.get("issued_at").toString()).substring(0,10);
  return response(render(name,Objects.toString(row.get("student_number"),""),Objects.toString(row.get("certificate_code"),""),date,true),"HIA-certificate-"+id+".pdf",false);
 }
 @GetMapping("/admin/certificates/{id}/pdf") public ResponseEntity<byte[]> adminDownload(Authentication auth,@PathVariable Long id)throws IOException{
  if(!"ADMIN".equals(current.require(auth).role))throw new ResponseStatusException(HttpStatus.FORBIDDEN);
  var rows=jdbc.queryForList("SELECT c.certificate_code,c.issued_at,COALESCE(c.display_name,u.full_name) AS full_name,u.student_number,c.completion_date FROM academy_certificates c JOIN portal_enrollments e ON e.id=c.enrollment_id JOIN portal_users u ON u.id=e.user_id WHERE c.id=?",id);
  if(rows.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND);
  var row=rows.get(0);return response(render(Objects.toString(row.get("full_name"),""),Objects.toString(row.get("student_number"),""),Objects.toString(row.get("certificate_code"),""),Objects.toString(row.get("completion_date"),row.get("issued_at").toString()).substring(0,10),true),"HIA-certificate-"+id+".pdf",true);
 }
 public ResponseEntity<byte[]> renderDraft(Map<String,Object> draft)throws IOException{
  var rows=jdbc.queryForList("SELECT u.student_number FROM portal_enrollments e JOIN portal_users u ON u.id=e.user_id WHERE e.id=?",draft.get("enrollment_id"));
  if(rows.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND);
  return response(render(Objects.toString(draft.get("student_name"),""),Objects.toString(rows.get(0).get("student_number"),""),Objects.toString(draft.get("certificate_code"),""),draft.get("completion_date").toString(),false),"HIA-preview.pdf",true);
 }
 private ResponseEntity<byte[]> response(byte[] data,String filename,boolean inline){return ResponseEntity.ok().contentType(MediaType.APPLICATION_PDF).header(HttpHeaders.CONTENT_DISPOSITION,(inline?"inline":"attachment")+"; filename=\""+filename+"\"").header(HttpHeaders.CACHE_CONTROL,"no-store").body(data);}
 private byte[] render(String name,String studentId,String code,String date,boolean issued)throws IOException{
  try(var doc=new PDDocument();var out=new ByteArrayOutputStream()){
   var page=new PDPage(new PDRectangle(842,562));doc.addPage(page);
   try(var cs=new PDPageContentStream(doc,page)){
    try(var stream=getClass().getResourceAsStream("/certificate-background.png")){
     if(stream==null)throw new IOException("Certificate background missing");
     BufferedImage background=ImageIO.read(stream);cs.drawImage(LosslessFactory.createFromImage(doc,background),0,0,842,562);
    }
    PDFont font;try(var fontStream=getClass().getResourceAsStream("/certificate-font.ttf")){font=PDType0Font.load(doc,fontStream);}
    // Clean template: no flattened footer labels/signature or raster certification line.
    // Keep live PDF text separated from both the banner and recipient name.
    PDFont captionFont=new PDType1Font(Standard14Fonts.FontName.TIMES_ROMAN);
    center(cs,captionFont,"This is to certify that",421,335,14);
    centerFit(cs,font,name,421,307,27,460);
    center(cs,font,"Certificate ID",157,101,8);
    centerFit(cs,font,code,157,86,10,132);
    center(cs,font,"Student ID",297,101,8);
    centerFit(cs,font,studentId,297,86,10,126);
    center(cs,font,"Completion Date",226,64,8);
    center(cs,font,date,226,48,11);
    try(var signatureStream=getClass().getResourceAsStream("/certificate-signature.png")){
     if(signatureStream==null)throw new IOException("Certificate signature missing");
     BufferedImage signature=ImageIO.read(signatureStream);
     float scale=Math.min(116f/signature.getWidth(),62f/signature.getHeight());
     float w=signature.getWidth()*scale,h=signature.getHeight()*scale;
     cs.drawImage(LosslessFactory.createFromImage(doc,signature),598-w/2,53+(62-h)/2,w,h);
    }
    cs.setStrokingColor(new java.awt.Color(185,143,65));cs.setLineWidth(.5f);
    cs.moveTo(548,51);cs.lineTo(648,51);cs.stroke();
    center(cs,font,"Authorized Signature",598,40,8);
    if(issued){String url=publicUrl.replaceAll("/+$","")+"/verify-certificate/"+code;
     try{BitMatrix bits=new MultiFormatWriter().encode(url,BarcodeFormat.QR_CODE,300,300);
      BufferedImage qr=new BufferedImage(300,300,BufferedImage.TYPE_INT_RGB);
      for(int y=0;y<300;y++)for(int x=0;x<300;x++)qr.setRGB(x,y,bits.get(x,y)?0xff071e38:0xffffffff);
      cs.drawImage(LosslessFactory.createFromImage(doc,qr),723,50,63,63);
      center(cs,font,"Verify Certificate",754.5f,40,7);
     }catch(WriterException ex){throw new IOException("QR code failed",ex);}
    }else{
     center(cs,font,"DRAFT - NOT VALID",744,86,8);
     center(cs,font,"Awaiting admin approval",744,70,6);
    }
   }
   doc.save(out);return out.toByteArray();
  }
 }
 private void centerFit(PDPageContentStream cs,PDFont font,String s,float x,float y,float preferred,float maxWidth)throws IOException{
  s=s==null?"":s.strip().replaceAll("[\\r\\n\\t]+"," ");
  float units=font.getStringWidth(s)/1000f;
  center(cs,font,s,x,y,units>0?Math.min(preferred,maxWidth/units):preferred);
 }
 private void center(PDPageContentStream cs,PDFont font,String s,float center,float y,float size)throws IOException{
  float width=font.getStringWidth(s)/1000*size;text(cs,font,s,center-width/2,y,size);
 }
 private void text(PDPageContentStream cs,PDFont font,String s,float x,float y,float size)throws IOException{
  cs.beginText();cs.setNonStrokingColor(new java.awt.Color(7,30,56));cs.setFont(font,size);cs.newLineAtOffset(x,y);cs.showText(s==null?"":s);cs.endText();
 }
 private String ascii(String s){return s==null?"":s.replaceAll("[^\\x20-\\x7E]","?");}
}
