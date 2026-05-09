import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { v4 as uuidv4 } from "uuid";
import { Tribute } from "../../../lib/setup";
export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    console.log("BrantSteele import request received with code:", code);

    if (!code) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }

    const initUrl = `https://brantsteele.net/hungergames/r.php?c=${encodeURIComponent(
      code
    )}`;
    console.log("Initialising BrantSteele session:", initUrl);

    const initRes = await fetch(initUrl, {
      method: "GET",
      headers: {
        "User-Agent": "HNGR-Import/1.0",
        Accept: "text/html",
      },
      redirect: "manual",
    });

    const cookie = initRes.headers.get("set-cookie") ?? "";
    console.log("BrantSteele set-cookie:", cookie || "(none)");

    const pageUrl = "https://brantsteele.net/hungergames/reaping.php";
    console.log("Fetching BrantSteele reaping page:", pageUrl);

    const response = await fetch(pageUrl, {
      method: "GET",
      headers: {
        "User-Agent": "HNGR-Import/1.0",
        Accept: "text/html",
        cookie,
      },
    });

    console.log("BrantSteele page response status:", response.status);

    if (!response.ok) {
      let errorMessage = "Failed to fetch data from BrantSteele";

      try {
        const errorData = await response.json();
        console.error("BrantSteele API error response:", errorData);
        if (typeof errorData?.error === "string") {
          errorMessage = errorData.error;
        }
      } catch {
        const errorText = await response.text();
        console.error("BrantSteele API non-JSON error response:", errorText);
      }

      throw new Error(errorMessage);
    }

    const html = await response.text();
    console.log("BrantSteele HTML length:", html.length);
    const $ = cheerio.load(html);
    console.log("table.tribute count =", $("table.tribute").length);

    if ($("table.tribute").length === 0) {
      console.log("Fallback: attempting to parse reaping page layout");
      $("table").each((_, table) => {
        if ($(table).find("td.district").length > 0) {
          $(table).addClass("tribute");
        }
      });
      console.log("Fallback tribute table count =", $("table.tribute").length);
    }

    const tributes: Tribute[] = [];

    // First, extract all images from all tables in order
    const allImages: string[] = [];
    
    // Extract images from all tribute tables
    $("table.tribute").each((_, table) => {
      const $table = $(table);
      
      // Find the row with images (usually the second row)
      const $imageRow = $table.find("tr").eq(1); // Second row (0-indexed)
      $imageRow.find("img").each((_, img) => {
        const src = $(img).attr("src");
        if (src) {
          const fullUrl = src.startsWith("/") ? `https://brantsteele.net${src}` : src;
          allImages.push(fullUrl);
        }
      });
    });

    console.log("Found total images:", allImages.length);

    let globalImageIndex = 0;
    let globalPositionIndex = 0; // Track position across all tables

    // Process all tribute tables
    $("table.tribute").each((_, table) => {
      const $table = $(table);
      
      // Extract district information from the first row
      const $districtRow = $table.find("tr").first();
      const districts: number[] = [];
      
      $districtRow.find("td.district").each((_, districtCell) => {
        const districtText = $(districtCell).text().trim();
        const districtMatch = districtText.match(/District\s+(\d+)/);
        if (districtMatch) {
          districts.push(Number(districtMatch[1]));
        }
      });

      console.log("Processing districts in this table:", districts);

      // Get the row with tribute names (usually the third row)
      const $nameRow = $table.find("tr").eq(2); // Third row (0-indexed)
      const $nameCells = $nameRow.find("td");

      $nameCells.each((index, cell) => {
        const $cell = $(cell);
        
        // Extract name and status
        const cellText = $cell.text().trim();
        const nameStatusText = $cell.html()?.split('<br')?.[0]?.trim() || cellText;
        const name = nameStatusText.replace(/<[^>]*>/g, '').trim();
        
        console.log(`Cell ${index}: raw text="${cellText}", extracted name="${name}"`);
        
        // Determine which district this tribute belongs to (within this table)
        // Each district spans 2 columns (male/female)
        const districtIndex = Math.floor(index / 2);
        const district = districts[districtIndex] || null;
        
        // Determine gender by position within district (0 = male, 1 = female)
        const positionInDistrict = index % 2;
        const gender = positionInDistrict === 0 ? "male" : "female";

        // Set pronouns based on inferred gender
        const pronouns = gender === "male" 
          ? { subject: "he", object: "him", possessive: "his", reflexive: "himself" }
          : { subject: "she", object: "her", possessive: "her", reflexive: "herself" };

        // Get the corresponding image - use global position index
        let image = globalImageIndex < allImages.length ? allImages[globalImageIndex] : null;
        
        // Always create a tribute, even if it has a placeholder name
        let finalName = name;
        if (!name || name === "Alive" || name.startsWith("District")) {
          // Generate a name for placeholders
          const gender = positionInDistrict === 0 ? "male" : "female";
          finalName = `District ${district} ${gender === "male" ? "Male" : "Female"}`;
          console.log(`PLACEHOLDER: "${finalName}" at district ${district}, local position ${index}, global position ${globalPositionIndex}`);
        } else {
          console.log(`NAMED: ${name} - district ${district}, local position ${index}, global position ${globalPositionIndex}, gender ${gender}, image index ${globalImageIndex}`);
        }
        
        globalImageIndex++;
        globalPositionIndex++;

        // Extract status from font tag
        const status = $cell.find("font").text().trim() || null;

        tributes.push({
          id: uuidv4(),
          name: finalName,
          pronouns,
          image: image,
          bio: "",
          district: district || 1, // Provide default district
          relationships: {},
          health: { physical: 100, mental: 100 }, // Match the expected schema
          foodLvl: 100,
          inventory: {},
        });
      });
    });

    if (tributes.length === 0) {
      console.error("No tributes parsed. Dumping debug info.");

      const debugSample = html.slice(0, 2000);

      return NextResponse.json(
        {
          error: "No tributes found. Invalid code or unsupported page.",
          debug: {
            htmlLength: html.length,
            tributeTableCount: $("table.tribute").length,
            htmlSample: debugSample,
            rawHtml: html.substring(0, 5000), // Limit for logging
          },
        },
        { status: 422 }
      );
    }

    console.log(`Extracted ${tributes.length} tributes from BrantSteele`);

    return NextResponse.json({
      success: true,
      data: {
        tributes,
      },
    });
  } catch (error) {
    console.error("BrantSteele import error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
