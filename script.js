// =====================================================
// CẤU HÌNH
// =====================================================

// Google Sheets xuất dữ liệu dạng CSV

const SHEET_URL =
    "https://docs.google.com/spreadsheets/d/" +
    "1Y_1yX00pbMFD416BXNSe2ClxGGGUK2kdps93Pz7Agh4/" +
    "export?format=csv&gid=0";


// Google Apps Script

const SCRIPT_URL =
    "https://script.google.com/macros/s/" +
    "AKfycbw5JwJ9Kil9T9ul12UqJ8mXen4l0Exdq4HJaHDK7ZEKdRYy58cBoyEBd9-ynVZo1somoA/" +
    "exec";


// =====================================================
// BIẾN LƯU DỮ LIỆU
// =====================================================

let latestData = null;


// =====================================================
// CHUYỂN GIÁ TRỊ SANG SỐ
// =====================================================

function parseNumber(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return 0;

    }


    let text = String(value)
        .trim()
        .replace(/"/g, "")
        .replace(",", ".");


    const number = Number(text);


    if (isNaN(number)) {

        return 0;

    }


    return number;

}


// =====================================================
// LÀM SẠCH TÊN CỘT
// =====================================================

function normalizeHeader(header) {

    return String(header)

        .trim()

        .replace(/^\uFEFF/, "")

        .toLowerCase()

        .normalize("NFD")

        .replace(/[\u0300-\u036f]/g, "")

        .replace(/\s+/g, "_");

}


// =====================================================
// CHUYỂN CSV THÀNH DỮ LIỆU
// =====================================================

function parseCSV(csvText) {

    const lines =
        csvText
            .trim()
            .split(/\r?\n/);


    if (lines.length < 2) {

        return [];

    }


    // ================================================
    // ĐỌC HEADER
    // ================================================

    const headers =
        splitCSVLine(lines[0])
            .map(
                normalizeHeader
            );


    const data = [];


    // ================================================
    // ĐỌC TỪNG DÒNG
    // ================================================

    for (
        let i = 1;
        i < lines.length;
        i++
    ) {

        const line =
            lines[i]
                .trim();


        if (!line) {

            continue;

        }


        const values =
            splitCSVLine(line);


        const row = {};


        headers.forEach(

            function (header, index) {

                row[header] =
                    values[index] !== undefined
                        ? values[index]
                        : "";

            }

        );


        data.push(row);

    }


    return data;

}


// =====================================================
// TÁCH DÒNG CSV
// HỖ TRỢ DỮ LIỆU CÓ DẤU NHÁY
// =====================================================

function splitCSVLine(line) {

    const result = [];

    let current = "";

    let insideQuotes = false;


    for (
        let i = 0;
        i < line.length;
        i++
    ) {

        const character =
            line[i];


        // ============================================
        // XỬ LÝ DẤU NHÁY
        // ============================================

        if (character === '"') {

            insideQuotes =
                !insideQuotes;


            continue;

        }


        // ============================================
        // XỬ LÝ DẤU PHẨY
        // ============================================

        if (
            character === "," &&
            !insideQuotes
        ) {

            result.push(
                current.trim()
            );

            current = "";

        }

        else {

            current += character;

        }

    }


    // Thêm giá trị cuối cùng

    result.push(
        current.trim()
    );


    return result;

}


// =====================================================
// LẤY GIÁ TRỊ THEO NHIỀU TÊN CỘT CÓ THỂ CÓ
// =====================================================

function getValue(row, possibleNames) {

    for (
        const name of possibleNames
    ) {

        const normalizedName =
            normalizeHeader(name);


        if (
            row.hasOwnProperty(
                normalizedName
            )
        ) {

            return row[
                normalizedName
            ];

        }

    }


    return "";

}


// =====================================================
// CHUYỂN DÒNG DỮ LIỆU THÀNH DỮ LIỆU CẢM BIẾN
// =====================================================

function convertRowToSensorData(row) {

    // ================================================
    // THỜI GIAN
    // ================================================

    const time =
        getValue(
            row,
            [
                "Thoi_gian",
                "Thời gian",
                "Timestamp",
                "Time"
            ]
        );


    // ================================================
    // NHIỆT ĐỘ
    // ================================================

    const temperature =
        parseNumber(

            getValue(
                row,
                [
                    "Nhiet_do",
                    "Nhiệt độ",
                    "Temperature"
                ]
            )

        );


    // ================================================
    // ĐỘ ẨM
    // ================================================

    const humidity =
        parseNumber(

            getValue(
                row,
                [
                    "Do_am",
                    "Độ ẩm",
                    "Humidity"
                ]
            )

        );


    // ================================================
    // CO2
    // ================================================

    const co2 =
        parseNumber(

            getValue(
                row,
                [
                    "CO2",
                    "CO₂",
                    "Co2"
                ]
            )

        );


    // ================================================
    // PM2.5
    // ================================================

    const pm25 =
        parseNumber(

            getValue(
                row,
                [
                    "PM2.5",
                    "PM25",
                    "Pm2.5",
                    "Pm25"
                ]
            )

        );


    // ================================================
    // SỐ NGƯỜI
    // ================================================

    const people =
        parseNumber(

            getValue(
                row,
                [
                    "So_nguoi",
                    "Số người",
                    "People"
                ]
            )

        );


    return {

        time: time,

        temperature: temperature,

        humidity: humidity,

        co2: co2,

        pm25: pm25,

        people: people

    };

}


// =====================================================
// TẢI DỮ LIỆU TỪ GOOGLE SHEETS
// =====================================================

async function loadData() {

    try {

        console.log(
            "Đang tải dữ liệu..."
        );


        // Thêm thời gian để tránh cache

        const url =
            SHEET_URL +
            "&t=" +
            new Date().getTime();


        const response =
            await fetch(url);


        if (!response.ok) {

            throw new Error(
                "Không thể tải Google Sheets"
            );

        }


        const csvText =
            await response.text();


        console.log(
            "CSV nhận được:"
        );

        console.log(
            csvText.substring(0, 1000)
        );


        // ============================================
        // PHÂN TÍCH CSV
        // ============================================

        const rows =
            parseCSV(csvText);


        if (
            rows.length === 0
        ) {

            throw new Error(
                "Google Sheets chưa có dữ liệu"
            );

        }


        // ============================================
        // IN TÊN CỘT RA CONSOLE
        // ============================================

        console.log(
            "Tên cột:"
        );

        console.log(
            Object.keys(rows[0])
        );


        // ============================================
        // LẤY DÒNG DỮ LIỆU MỚI NHẤT
        // ============================================

        const lastRow =
            rows[
                rows.length - 1
            ];


        console.log(
            "Dòng mới nhất:"
        );

        console.log(
            lastRow
        );


        // ============================================
        // CHUYỂN ĐỔI DỮ LIỆU
        // ============================================

        latestData =
            convertRowToSensorData(
                lastRow
            );


        console.log(
            "Dữ liệu đã xử lý:"
        );

        console.log(
            latestData
        );


        // ============================================
        // HIỂN THỊ
        // ============================================

        updateDashboard();


    }

    catch (error) {

        console.error(
            "Lỗi tải dữ liệu:",
            error
        );


        document.getElementById(
            "lastUpdate"
        ).textContent =
            "Không thể tải dữ liệu";

    }

}


// =====================================================
// CẬP NHẬT DASHBOARD
// =====================================================

function updateDashboard() {

    if (!latestData) {

        return;

    }


    // ================================================
    // HIỂN THỊ THỜI GIAN
    // ================================================

    document.getElementById(
        "lastUpdate"
    ).textContent =
        latestData.time ||
        new Date()
            .toLocaleString(
                "vi-VN"
            );


    // ================================================
    // NHIỆT ĐỘ
    // ================================================

    document.getElementById(
        "temperature"
    ).textContent =
        latestData.temperature
            .toFixed(1);


    // ================================================
    // ĐỘ ẨM
    // ================================================

    document.getElementById(
        "humidity"
    ).textContent =
        latestData.humidity
            .toFixed(1);


    // ================================================
    // CO2
    // ================================================

    document.getElementById(
        "co2"
    ).textContent =
        latestData.co2
            .toFixed(0);


    // ================================================
    // PM2.5
    // ================================================

    document.getElementById(
        "pm25"
    ).textContent =
        latestData.pm25
            .toFixed(1);


    // ================================================
    // SỐ NGƯỜI
    // ================================================

    document.getElementById(
        "people"
    ).textContent =
        latestData.people
            .toFixed(0);


    // ================================================
    // CẬP NHẬT Ô HIỆU CHỈNH SỐ NGƯỜI
    // ================================================

    const peopleInput =
        document.getElementById(
            "peopleInput"
        );


    if (peopleInput) {

        peopleInput.value =
            latestData.people
                .toFixed(0);

    }


    // ================================================
    // CẬP NHẬT TRẠNG THÁI KHÔNG KHÍ
    // ================================================

    updateAirStatus();

}


// =====================================================
// ĐÁNH GIÁ CHẤT LƯỢNG KHÔNG KHÍ
// =====================================================

function updateAirStatus() {

    const airStatus =
        document.getElementById(
            "airStatus"
        );


    if (!airStatus) {

        return;

    }


    // ================================================
    // MỨC NGUY HIỂM
    // ================================================

    if (

        latestData.co2 >= 1000 ||

        latestData.pm25 >= 35

    ) {

        airStatus.innerHTML =
            "🔴 NGUY HIỂM: Chất lượng không khí kém";

        airStatus.className =
            "air-status danger";


        return;

    }


    // ================================================
    // MỨC CẦN CHÚ Ý
    // ================================================

    if (

        latestData.co2 >= 800 ||

        latestData.pm25 >= 12

    ) {

        airStatus.innerHTML =
            "🟡 CẦN CHÚ Ý: Chất lượng không khí đang tăng";

        airStatus.className =
            "air-status warning";


        return;

    }


    // ================================================
    // BÌNH THƯỜNG
    // ================================================

    airStatus.innerHTML =
        "🟢 BÌNH THƯỜNG: Chất lượng không khí tốt";

    airStatus.className =
        "air-status normal";

}


// =====================================================
// GỬI DỮ LIỆU POST ĐẾN GOOGLE APPS SCRIPT
// =====================================================

async function sendCommand(data) {

    const response =
        await fetch(

            SCRIPT_URL,

            {

                method: "POST",

                headers: {

                    "Content-Type":
                        "text/plain;charset=utf-8"

                },

                body:
                    JSON.stringify(data)

            }

        );


    const result =
        await response.text();


    console.log(
        "Server response:",
        result
    );


    return result;

}


// =====================================================
// HIỆU CHỈNH SỐ NGƯỜI
// =====================================================

async function updatePeople() {

    const input =
        document.getElementById(
            "peopleInput"
        );


    const people =
        parseInt(
            input.value
        );


    if (

        isNaN(people) ||

        people < 0

    ) {

        alert(
            "Số người không hợp lệ!"
        );

        return;

    }


    try {

        await sendCommand({

            action:
                "set_people",

            so_nguoi:
                people

        });


        alert(
            "Đã gửi lệnh cập nhật số người: " +
            people
        );


        // Cập nhật giao diện ngay

        document.getElementById(
            "people"
        ).textContent =
            people;


        // Tải lại dữ liệu sau 2 giây

        setTimeout(

            loadData,

            2000

        );


    }

    catch (error) {

        console.error(error);


        alert(
            "Không thể cập nhật số người!"
        );

    }

}


// =====================================================
// CHUYỂN CHẾ ĐỘ LED
// =====================================================

async function setLedMode(mode) {

    try {

        await sendCommand({

            action:
                "set_led",

            mode:
                mode,

            red:
                "OFF",

            yellow:
                "OFF",

            green:
                "OFF"

        });


        alert(
            "Đã chuyển sang chế độ " +
            mode
        );


    }

    catch (error) {

        console.error(error);


        alert(
            "Không thể gửi lệnh LED!"
        );

    }

}


// =====================================================
// ĐIỀU KHIỂN LED
// =====================================================

async function setLed(

    color,

    state

) {

    try {

        // ============================================
        // LẤY CHẾ ĐỘ HIỆN TẠI
        // ============================================

        const data = {

            action:
                "set_led",

            mode:
                "MANUAL",

            red:
                "OFF",

            yellow:
                "OFF",

            green:
                "OFF"

        };


        // ============================================
        // GÁN LED ĐƯỢC CHỌN
        // ============================================

        if (

            color === "red"

        ) {

            data.red =
                state;

        }


        if (

            color === "yellow"

        ) {

            data.yellow =
                state;

        }


        if (

            color === "green"

        ) {

            data.green =
                state;

        }


        // ============================================
        // GỬI LỆNH
        // ============================================

        await sendCommand(
            data
        );


        alert(

            "Đã gửi lệnh: LED " +

            color +

            " = " +

            state

        );


    }

    catch (error) {

        console.error(error);


        alert(
            "Không thể điều khiển LED!"
        );

    }

}


// =====================================================
// TỰ ĐỘNG TẢI DỮ LIỆU
// =====================================================

// Tải ngay khi mở trang

loadData();


// Tự động cập nhật mỗi 10 giây

setInterval(

    loadData,

    10000

);
