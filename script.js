// =====================================================
// CẤU HÌNH HỆ THỐNG
// =====================================================


// URL GOOGLE SHEETS DẠNG CSV

const SHEET_URL =
    "https://docs.google.com/spreadsheets/d/" +
    "1Y_1yX00pbMFD416BXNSe2ClxGGGUK2kdps93Pz7Agh4/" +
    "export?format=csv&gid=0";


// URL GOOGLE APPS SCRIPT

const SCRIPT_URL =
    "https://script.google.com/macros/s/" +
    "AKfycbw5JwJ9Kil9T9ul12UqJ8mXen4l0Exdq4HJaHDK7ZEKdRYy58cBoyEBd9-ynVZo1somoA/" +
    "exec";


// =====================================================
// BIẾN LƯU TRẠNG THÁI LED
// =====================================================


let ledMode = "AUTO";

let redStatus = "OFF";

let yellowStatus = "OFF";

let greenStatus = "OFF";


// =====================================================
// HÀM ĐỌC FILE CSV
//
// Có xử lý:
// - Dấu phẩy bên trong dấu ngoặc kép
// - Số thập phân dùng dấu phẩy
// - Dữ liệu Google Sheets xuất dạng CSV
// =====================================================

function parseCSV(csvText) {

    const rows = [];

    let currentRow = [];

    let currentValue = "";

    let insideQuotes = false;


    // =============================================
    // DUYỆT TỪNG KÝ TỰ
    // =============================================

    for (
        let i = 0;
        i < csvText.length;
        i++
    ) {

        const character =
            csvText[i];


        // =============================================
        // XỬ LÝ DẤU NGOẶC KÉP
        // =============================================

        if (
            character === '"'
        ) {

            // -----------------------------------------
            // DẤU NGOẶC KÉP ĐÔI ""
            // -----------------------------------------

            if (

                insideQuotes &&

                csvText[i + 1] === '"'

            ) {

                currentValue += '"';

                i++;

            }


            // -----------------------------------------
            // BẮT ĐẦU / KẾT THÚC VÙNG NGOẶC KÉP
            // -----------------------------------------

            else {

                insideQuotes =
                    !insideQuotes;

            }

        }


        // =============================================
        // XỬ LÝ DẤU PHẨY
        // Chỉ tách cột nếu KHÔNG nằm trong ""
        // =============================================

        else if (

            character === "," &&

            !insideQuotes

        ) {

            currentRow.push(

                currentValue.trim()

            );


            currentValue = "";

        }


        // =============================================
        // XỬ LÝ XUỐNG DÒNG
        // =============================================

        else if (

            (
                character === "\n" ||

                character === "\r"
            ) &&

            !insideQuotes

        ) {

            // -----------------------------------------
            // XỬ LÝ WINDOWS \r\n
            // -----------------------------------------

            if (

                character === "\r" &&

                csvText[i + 1] === "\n"

            ) {

                i++;

            }


            // -----------------------------------------
            // THÊM GIÁ TRỊ CUỐI CÙNG VÀO DÒNG
            // -----------------------------------------

            currentRow.push(

                currentValue.trim()

            );


            // -----------------------------------------
            // THÊM DÒNG VÀO DANH SÁCH
            // -----------------------------------------

            if (

                currentRow.length > 1 ||

                currentRow[0] !== ""

            ) {

                rows.push(
                    currentRow
                );

            }


            // -----------------------------------------
            // RESET DÒNG
            // -----------------------------------------

            currentRow = [];

            currentValue = "";

        }


        // =============================================
        // KÝ TỰ BÌNH THƯỜNG
        // =============================================

        else {

            currentValue +=
                character;

        }

    }


    // =============================================
    // THÊM DÒNG CUỐI CÙNG
    // =============================================

    if (

        currentValue !== "" ||

        currentRow.length > 0

    ) {

        currentRow.push(

            currentValue.trim()

        );


        rows.push(
            currentRow
        );

    }


    return rows;

}


// =====================================================
// HÀM CHUYỂN DỮ LIỆU SANG SỐ
// =====================================================

function parseNumber(value) {

    if (

        value === undefined ||

        value === null ||

        value === ""

    ) {

        return null;

    }


    const normalizedValue =
        String(value)
        .trim()
        .replace(",", ".");


    const number =
        Number(normalizedValue);


    if (

        Number.isNaN(number)

    ) {

        return null;

    }


    return number;

}


// =====================================================
// HÀM ĐỊNH DẠNG SỐ
// =====================================================

function formatNumber(value) {

    const number =
        parseNumber(value);


    if (

        number === null

    ) {

        return "--";

    }


    // Nếu là số nguyên

    if (

        Number.isInteger(number)

    ) {

        return number.toString();

    }


    // Làm tròn tối đa 2 chữ số thập phân

    return number
        .toFixed(2)
        .replace(/\.?0+$/, "");

}


// =====================================================
// HÀM ĐỌC DỮ LIỆU TỪ GOOGLE SHEETS
// =====================================================

async function loadData() {

    try {

        console.log(
            "Đang tải dữ liệu..."
        );


        // =============================================
        // TẢI FILE CSV
        // =============================================

        const response =
            await fetch(

                SHEET_URL +
                "&t=" +
                new Date().getTime()

            );


        // =============================================
        // KIỂM TRA KẾT NỐI
        // =============================================

        if (

            !response.ok

        ) {

            throw new Error(

                "Không thể tải dữ liệu"

            );

        }


        // =============================================
        // ĐỌC NỘI DUNG CSV
        // =============================================

        const csvText =
            await response.text();


        // =============================================
        // KIỂM TRA CSV
        // =============================================

        if (

            !csvText ||

            csvText.trim() === ""

        ) {

            throw new Error(

                "Google Sheets chưa có dữ liệu"

            );

        }


        // =============================================
        // ĐỌC CSV ĐÚNG ĐỊNH DẠNG
        // =============================================

        const rows =
            parseCSV(
                csvText
            );


        // =============================================
        // KIỂM TRA SỐ DÒNG
        // =============================================

        if (

            rows.length < 2

        ) {

            throw new Error(

                "Chưa có dữ liệu hợp lệ"

            );

        }


        // =============================================
        // LẤY TÊN CỘT
        // =============================================

        const headers =
            rows[0].map(

                header =>

                    header
                    .trim()
                    .replace(
                        /^\uFEFF/,
                        ""
                    )

            );


        console.log(

            "Tên các cột:",

            headers

        );


        // =============================================
        // TÌM DÒNG DỮ LIỆU MỚI NHẤT HỢP LỆ
        // =============================================

        let latestRow = null;


        for (

            let i =
                rows.length - 1;

            i >= 1;

            i--

        ) {

            const row =
                rows[i];


            // -----------------------------------------
            // BỎ QUA DÒNG TRỐNG
            // -----------------------------------------

            if (

                !row ||

                row.length === 0

            ) {

                continue;

            }


            // -----------------------------------------
            // KIỂM TRA CÓ DỮ LIỆU THỜI GIAN
            // -----------------------------------------

            if (

                row[0] !== undefined &&

                String(
                    row[0]
                ).trim() !== ""

            ) {

                latestRow =
                    row;

                break;

            }

        }


        // =============================================
        // KHÔNG TÌM THẤY DỮ LIỆU
        // =============================================

        if (

            !latestRow

        ) {

            throw new Error(

                "Không tìm thấy dữ liệu mới nhất"

            );

        }


        // =============================================
        // TẠO OBJECT DỮ LIỆU
        // =============================================

        const latestData = {};


        headers.forEach(

            (
                header,
                index
            ) => {

                latestData[
                    header
                ] =
                    latestRow[
                        index
                    ] !== undefined

                        ? latestRow[
                            index
                        ]

                        : "";

            }

        );


        // =============================================
        // HIỂN THỊ DEBUG
        // =============================================

        console.log(

            "================================"
        );


        console.log(

            "DỮ LIỆU MỚI NHẤT:"
        );


        console.log(
            latestData
        );


        console.log(

            "Nhiệt độ:",

            latestData["Nhiet_do"]
        );


        console.log(

            "Độ ẩm:",

            latestData["Do_am"]
        );


        console.log(

            "CO2:",

            latestData["CO2"]
        );


        console.log(

            "PM2.5:",

            latestData["PM2.5"]
        );


        console.log(

            "Số người:",

            latestData["So_nguoi"]
        );


        console.log(

            "Thời gian:",

            latestData["Thoi_gian"]
        );


        console.log(

            "================================"
        );


        // =============================================
        // CẬP NHẬT DASHBOARD
        // =============================================

        updateDashboard(

            latestData

        );


    }


    // =================================================
    // XỬ LÝ LỖI
    // =================================================

    catch (error) {

        console.error(

            "Lỗi tải dữ liệu:",

            error

        );


        document
            .getElementById(
                "lastUpdate"
            )
            .textContent =

                "Không thể tải dữ liệu";

    }

}


// =====================================================
// CẬP NHẬT DASHBOARD
// =====================================================

function updateDashboard(data) {

    // =============================================
    // LẤY DỮ LIỆU THEO TÊN CỘT
    // =============================================

    const temperature =
        data["Nhiet_do"];

    const humidity =
        data["Do_am"];

    const co2 =
        data["CO2"];

    const pm25 =
        data["PM2.5"];

    const people =
        data["So_nguoi"];

    const time =
        data["Thoi_gian"];


    // =============================================
    // HIỂN THỊ NHIỆT ĐỘ
    // =============================================

    document
        .getElementById(
            "temperature"
        )
        .textContent =
            formatNumber(
                temperature
            );


    // =============================================
    // HIỂN THỊ ĐỘ ẨM
    // =============================================

    document
        .getElementById(
            "humidity"
        )
        .textContent =
            formatNumber(
                humidity
            );


    // =============================================
    // HIỂN THỊ CO2
    // =============================================

    document
        .getElementById(
            "co2"
        )
        .textContent =
            formatNumber(
                co2
            );


    // =============================================
    // HIỂN THỊ PM2.5
    // =============================================

    document
        .getElementById(
            "pm25"
        )
        .textContent =
            formatNumber(
                pm25
            );


    // =============================================
    // HIỂN THỊ SỐ NGƯỜI
    // =============================================

    document
        .getElementById(
            "people"
        )
        .textContent =
            formatNumber(
                people
            );


    // =============================================
    // ĐỒNG BỘ Ô NHẬP SỐ NGƯỜI
    // =============================================

    const peopleNumber =
        parseNumber(
            people
        );


    document
        .getElementById(
            "peopleInput"
        )
        .value =

            peopleNumber !== null

                ? Math.round(
                    peopleNumber
                )

                : 0;


    // =============================================
    // HIỂN THỊ THỜI GIAN
    // =============================================

    document
        .getElementById(
            "lastUpdate"
        )
        .textContent =

            time || "--";


    // =============================================
    // CẬP NHẬT TRẠNG THÁI KHÔNG KHÍ
    // =============================================

    updateAirStatus(

        co2,

        pm25

    );

}


// =====================================================
// ĐÁNH GIÁ CHẤT LƯỢNG KHÔNG KHÍ
// =====================================================

function updateAirStatus(
    co2,
    pm25
) {

    const statusElement =
        document
        .getElementById(
            "airStatus"
        );


    const co2Value =
        parseNumber(
            co2
        );


    const pm25Value =
        parseNumber(
            pm25
        );


    // =============================================
    // KIỂM TRA DỮ LIỆU
    // =============================================

    if (

        co2Value === null ||

        pm25Value === null

    ) {

        statusElement.textContent =
            "⚪ CHƯA ĐỦ DỮ LIỆU ĐỂ ĐÁNH GIÁ";

        statusElement.style.background =
            "#e5e7eb";

        statusElement.style.color =
            "#374151";

        return;

    }


    // =============================================
    // MỨC CẢNH BÁO
    // =============================================

    if (

        co2Value >= 1000 ||

        pm25Value >= 12

    ) {

        statusElement.textContent =
            "🔴 CẢNH BÁO: Chất lượng không khí không tốt";

        statusElement.style.background =
            "#fee2e2";

        statusElement.style.color =
            "#b91c1c";

    }


    // =============================================
    // CẦN CHÚ Ý
    // =============================================

    else if (

        co2Value >= 800

    ) {

        statusElement.textContent =
            "🟡 CẦN CHÚ Ý: CO₂ đang tăng";

        statusElement.style.background =
            "#fef3c7";

        statusElement.style.color =
            "#92400e";

    }


    // =============================================
    // BÌNH THƯỜNG
    // =============================================

    else {

        statusElement.textContent =
            "🟢 BÌNH THƯỜNG: Chất lượng không khí tốt";

        statusElement.style.background =
            "#dcfce7";

        statusElement.style.color =
            "#166534";

    }

}


// =====================================================
// CẬP NHẬT SỐ NGƯỜI
// =====================================================

async function updatePeople() {

    const peopleInput =
        document
        .getElementById(
            "peopleInput"
        );


    const people =
        Number(
            peopleInput.value
        );


    // =============================================
    // KIỂM TRA DỮ LIỆU
    // =============================================

    if (

        Number.isNaN(
            people
        )

    ) {

        alert(

            "Vui lòng nhập số người hợp lệ"

        );

        return;

    }


    if (

        people < 0

    ) {

        alert(

            "Số người không thể nhỏ hơn 0"

        );

        return;

    }


    // =============================================
    // TẠO DỮ LIỆU GỬI ĐI
    // =============================================

    const data = {

        action:
            "set_people",

        so_nguoi:
            Math.round(
                people
            )

    };


    try {

        console.log(

            "Gửi lệnh số người:",

            data

        );


        // =============================================
        // GỬI POST
        // =============================================

        const response =
            await fetch(

                SCRIPT_URL,

                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "text/plain;charset=utf-8"

                    },

                    body:
                        JSON.stringify(
                            data
                        )

                }

            );


        const result =
            await response.text();


        console.log(

            "Phản hồi:",

            result

        );


        // =============================================
        // CẬP NHẬT GIAO DIỆN
        // =============================================

        document
            .getElementById(
                "people"
            )
            .textContent =

                Math.round(
                    people
                );


        alert(

            "Đã gửi lệnh cập nhật số người"

        );


    }

    catch (error) {

        console.error(

            "Lỗi cập nhật số người:",

            error

        );


        alert(

            "Không thể gửi lệnh"

        );

    }

}


// =====================================================
// THAY ĐỔI CHẾ ĐỘ LED
// =====================================================

function setLedMode(mode) {

    ledMode =
        mode;


    sendLedCommand();

}


// =====================================================
// ĐIỀU KHIỂN LED
// =====================================================

function setLed(
    led,
    status
) {

    // =============================================
    // LED ĐỎ
    // =============================================

    if (

        led === "red"

    ) {

        redStatus =
            status;

    }


    // =============================================
    // LED VÀNG
    // =============================================

    else if (

        led === "yellow"

    ) {

        yellowStatus =
            status;

    }


    // =============================================
    // LED XANH
    // =============================================

    else if (

        led === "green"

    ) {

        greenStatus =
            status;

    }


    // =============================================
    // CHUYỂN SANG CHẾ ĐỘ MANUAL
    // =============================================

    ledMode =
        "MANUAL";


    // =============================================
    // GỬI LỆNH
    // =============================================

    sendLedCommand();

}


// =====================================================
// GỬI LỆNH LED
// =====================================================

async function sendLedCommand() {

    // =============================================
    // TẠO DỮ LIỆU
    // =============================================

    const data = {

        action:
            "set_led",

        mode:
            ledMode,

        red:
            redStatus,

        yellow:
            yellowStatus,

        green:
            greenStatus

    };


    console.log(

        "Gửi lệnh LED:",

        data

    );


    try {

        // =============================================
        // GỬI POST
        // =============================================

        const response =
            await fetch(

                SCRIPT_URL,

                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "text/plain;charset=utf-8"

                    },

                    body:
                        JSON.stringify(
                            data
                        )

                }

            );


        const result =
            await response.text();


        console.log(

            "Phản hồi LED:",

            result

        );


        alert(

            "Đã cập nhật điều khiển LED"

        );


    }

    catch (error) {

        console.error(

            "Lỗi điều khiển LED:",

            error

        );


        alert(

            "Không thể gửi lệnh LED"

        );

    }

}


// =====================================================
// TẢI DỮ LIỆU LẦN ĐẦU
// =====================================================

loadData();


// =====================================================
// TỰ ĐỘNG CẬP NHẬT DỮ LIỆU
// =====================================================

// Cập nhật mỗi 30 giây

setInterval(

    loadData,

    30000

);
