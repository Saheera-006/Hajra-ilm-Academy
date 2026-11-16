package com.hajara.academy.portal;

import java.nio.file.*;
import org.junit.jupiter.api.Test;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.rendering.PDFRenderer;
import javax.imageio.ImageIO;
import static org.junit.jupiter.api.Assertions.*;

class CertificateLayoutTest {
 @Test void renderDraftAndIssuedWithLongNames() throws Exception {
  var controller = new CertificatePdfController(null, null);
  var url = CertificatePdfController.class.getDeclaredField("publicUrl");
  url.setAccessible(true); url.set(controller, "https://academy.example");
  var render = CertificatePdfController.class.getDeclaredMethod("render", String.class, String.class, String.class, String.class, boolean.class);
  render.setAccessible(true);
  Path dir = Path.of("target/certificate-preview"); Files.createDirectories(dir);
  for (boolean issued : new boolean[]{false,true}) {
   String name = issued ? "Ayesha Fathima Mohamed Abdul Rahman" : "Shahith S";
   byte[] pdf = (byte[]) render.invoke(controller,name,"HIA202602001","HIA-755C9421-A4A","2026-11-12",issued);
   String stem = issued ? "issued-layout-test" : "draft-layout-test";
   Files.write(dir.resolve(stem+".pdf"),pdf);
   try(var doc=Loader.loadPDF(pdf)) {
    assertEquals(1,doc.getNumberOfPages());
    String text=new PDFTextStripper().getText(doc);
    assertEquals(1,text.split("This is to certify that",-1).length-1);
    assertTrue(text.contains(name)); assertTrue(text.contains("HIA202602001"));
    assertTrue(text.contains("2026-11-12"));
    assertEquals(!issued,text.contains("DRAFT - NOT VALID"));
    assertEquals(issued,text.contains("Verify Certificate"));
    ImageIO.write(new PDFRenderer(doc).renderImageWithDPI(0,120),"png",dir.resolve(stem+".png").toFile());
   }
  }
 }
}
