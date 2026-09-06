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
// HÀM ĐỌC DỮ LIỆU TỪ GOOGLE SHEETS
// =====================================================

async function loadData() {

    try {

        console.log(
            "Đang tải dữ liệu..."
        );


        const response =
            await fetch(
                SHEET_URL
            );


        const csvText =
            await response.text();


        const rows =
            csvText
            .trim()
            .split("\n");


        if (rows.length < 2) {

            throw new Error(
                "Chưa có dữ liệu"
            );

        }


        // =============================================
        // TÁCH TÊN CỘT
        // =============================================

        const headers =
            rows[0]
            .split(",")
            .map(
                header =>
                header.trim()
            );


        // =============================================
        // LẤY DÒNG DỮ LIỆU MỚI NHẤT
        // =============================================

        const latestRow =
            rows[
                rows.length - 1
            ]
            .split(",");


        const latestData = {};


        headers.forEach(
            (
                header,
                index
            ) => {

                latestData[
                    header
                ] =
                    latestRow[index];

            }
        );


        console.log(
            "Dữ liệu mới nhất:",
            latestData
        );


        // =============================================
        // CẬP NHẬT DASHBOARD
        // =============================================

        updateDashboard(
            latestData
        );


    } catch (error) {

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
    // LẤY DỮ LIỆU
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
            temperature || "--";


    // =============================================
    // HIỂN THỊ ĐỘ ẨM
    // =============================================

    document
        .getElementById(
            "humidity"
        )
        .textContent =
            humidity || "--";


    // =============================================
    // HIỂN THỊ CO2
    // =============================================

    document
        .getElementById(
            "co2"
        )
        .textContent =
            co2 || "--";


    // =============================================
    // HIỂN THỊ PM2.5
    // =============================================

    document
        .getElementById(
            "pm25"
        )
        .textContent =
            pm25 || "--";


    // =============================================
    // HIỂN THỊ SỐ NGƯỜI
    // =============================================

    document
        .getElementById(
            "people"
        )
        .textContent =
            people || "--";


    // Đồng bộ ô nhập số người

    document
        .getElementById(
            "peopleInput"
        )
        .value =
            people || 0;


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
        Number(co2);


    const pm25Value =
        Number(pm25);


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

    const people =
        document
        .getElementById(
            "peopleInput"
        )
        .value;


    if (

        Number(people) < 0

    ) {

        alert(
            "Số người không thể nhỏ hơn 0"
        );

        return;

    }


    const data = {

        action:
            "set_people",

        so_nguoi:
            Number(people)

    };


    try {

        const response =
            await fetch(

                SCRIPT_URL,

                {

                    method:
                        "POST",

                    body:
                        JSON.stringify(
                            data
                        )

                }

            );


        const result =
            await response.text();


        console.log(
            result
        );


        alert(
            "Đã gửi lệnh cập nhật số người"
        );


        // Cập nhật giao diện

        document
            .getElementById(
                "people"
            )
            .textContent =
                people;


    } catch (error) {

        console.error(
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

    if (

        led === "red"

    ) {

        redStatus =
            status;

    }


    else if (

        led === "yellow"

    ) {

        yellowStatus =
            status;

    }


    else if (

        led === "green"

    ) {

        greenStatus =
            status;

    }


    // Chuyển sang MANUAL

    ledMode =
        "MANUAL";


    sendLedCommand();

}


// =====================================================
// GỬI LỆNH LED
// =====================================================

async function sendLedCommand() {

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

        const response =
            await fetch(

                SCRIPT_URL,

                {

                    method:
                        "POST",

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


        alert(
            "Đã cập nhật điều khiển LED"
        );


    } catch (error) {

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
// TỰ ĐỘNG CẬP NHẬT
// =====================================================

// Cập nhật dữ liệu mỗi 30 giây

setInterval(

    loadData,

    30000

);
