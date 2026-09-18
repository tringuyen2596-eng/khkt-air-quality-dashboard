// =====================================================
// DASHBOARD KHKT - GIÁM SÁT CHẤT LƯỢNG KHÔNG KHÍ
// =====================================================
// Chức năng:
// 1. Đọc dữ liệu cảm biến từ Google Sheets
// 2. Hiển thị dữ liệu mới nhất
// 3. Hiển thị trạng thái chất lượng không khí
// 4. Đọc kết quả AI realtime
// 5. Hiển thị biểu đồ CO2 / PM2.5 / số người
// 6. Hiển thị biểu đồ CO2 thực tế + CO2 AI dự đoán
// 7. Lọc 1h / 6h / 24h / 7 ngày / tất cả
// 8. Điều khiển số người
// 9. Điều khiển LED AUTO / MANUAL
// =====================================================


// =====================================================
// CẤU HÌNH GOOGLE APPS SCRIPT
// =====================================================

const SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbw5JwJ9Kil9T9ul12UqJ8mXen4l0Exdq4HJaHDK7ZEKdRYy58cBoyEBd9-ynVZo1somoA/exec";


// =====================================================
// CẤU HÌNH GOOGLE SHEETS CSV
// =====================================================

const SHEET_URL =
    "https://docs.google.com/spreadsheets/d/" +
    "1Y_1yX00pbMFD416BXNSe2ClxGGGUK2kdps93Pz7Agh4/" +
    "export?format=csv&gid=0";


// =====================================================
// BIẾN DỮ LIỆU
// =====================================================

let allData = [];

let aiHistoryData = [];

let currentTimeRange = "1h";


// =====================================================
// BIẾN BIỂU ĐỒ
// =====================================================

let co2Chart = null;

let pm25Chart = null;

let peopleChart = null;

let aiCo2Chart = null;


// =====================================================
// CHUYỂN GIÁ TRỊ SANG SỐ
// =====================================================

function convertToNumber(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return 0;

    }


    let text =
        String(value)
            .trim()
            .replace(/"/g, "");


    // Hỗ trợ số dạng 1234,5

    text =
        text.replace(",", ".");


    const number =
        Number(text);


    if (
        !Number.isFinite(number)
    ) {

        return 0;

    }


    return number;

}


// =====================================================
// PARSE SỐ AN TOÀN
// =====================================================

function parseNumber(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return NaN;

    }


    let text =
        String(value)
            .trim()
            .replace(/"/g, "")
            .replace(",", ".");


    const number =
        Number(text);


    return Number.isFinite(number)
        ? number
        : NaN;

}


// =====================================================
// ĐỌC MỘT DÒNG CSV
// Hỗ trợ dấu phẩy nằm bên trong dấu " "
// =====================================================

function parseCSVLine(line) {

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


        if (
            character === '"'
        ) {

            insideQuotes =
                !insideQuotes;

        }

        else if (
            character === "," &&
            !insideQuotes
        ) {

            result.push(
                current
                    .trim()
                    .replace(/^"|"$/g, "")
            );

            current = "";

        }

        else {

            current += character;

        }

    }


    result.push(
        current
            .trim()
            .replace(/^"|"$/g, "")
    );


    return result;

}


// =====================================================
// PARSE GOOGLE SHEETS CSV
// =====================================================

function parseCSV(csvText) {

    const lines =
        csvText
            .trim()
            .split(/\r?\n/);


    if (
        lines.length < 2
    ) {

        return [];

    }


    const headers =
        parseCSVLine(
            lines[0]
        );


    const data = [];


    for (
        let i = 1;
        i < lines.length;
        i++
    ) {

        if (
            !lines[i].trim()
        ) {

            continue;

        }


        const values =
            parseCSVLine(
                lines[i]
            );


        const row = {};


        headers.forEach(
            function(
                header,
                index
            ) {

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
// TÌM CỘT
// =====================================================

function findColumn(
    headers,
    names
) {

    for (
        const name of names
    ) {

        const index =
            headers.indexOf(name);


        if (
            index !== -1
        ) {

            return index;

        }

    }


    return -1;

}


// =====================================================
// PARSE NGÀY GIỜ VIỆT NAM
//
// Hỗ trợ:
// dd/mm/yyyy hh:mm:ss
// dd-mm-yyyy hh:mm:ss
// yyyy-mm-dd hh:mm:ss
// ISO
// =====================================================

function parseVietnameseDate(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return null;

    }


    let text =
        String(value)
            .trim()
            .replace(/^"|"$/g, "");


    if (
        !text
    ) {

        return null;

    }


    // ---------------------------------------------
    // ISO / định dạng Date chuẩn
    // ---------------------------------------------

    if (
        /^\d{4}-\d{2}-\d{2}/.test(text)
    ) {

        const isoDate =
            new Date(text);


        if (
            !isNaN(
                isoDate.getTime()
            )
        ) {

            return isoDate;

        }

    }


    // ---------------------------------------------
    // dd/mm/yyyy hh:mm:ss
    // ---------------------------------------------

    const match =
        text.match(
            /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/
        );


    if (
        match
    ) {

        const day =
            Number(match[1]);

        const month =
            Number(match[2]) - 1;

        const year =
            Number(match[3]);

        const hour =
            Number(match[4] || 0);

        const minute =
            Number(match[5] || 0);

        const second =
            Number(match[6] || 0);


        const date =
            new Date(
                year,
                month,
                day,
                hour,
                minute,
                second
            );


        if (
            !isNaN(
                date.getTime()
            )
        ) {

            return date;

        }

    }


    // ---------------------------------------------
    // Thử Date cuối cùng
    // ---------------------------------------------

    const fallback =
        new Date(text);


    if (
        !isNaN(
            fallback.getTime()
        )
    ) {

        return fallback;

    }


    return null;

}


// =====================================================
// PARSE THỜI GIAN AI
// =====================================================

function parseAIHistoryDate(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return null;

    }


    return parseVietnameseDate(
        value
    );

}


// =====================================================
// LẤY GIÁ TRỊ CỘT AI
// Hỗ trợ nhiều cách viết
// =====================================================

function getAIValue(
    row,
    names
) {

    for (
        const name of names
    ) {

        if (
            row[name] !== undefined &&
            row[name] !== null &&
            row[name] !== ""
        ) {

            return row[name];

        }

    }


    return "";

}


// =====================================================
// ĐỌC DỮ LIỆU GOOGLE SHEETS
// =====================================================

async function loadData() {

    try {

        console.log(
            "Đang tải dữ liệu Google Sheets..."
        );


        const response =
            await fetch(
                SHEET_URL +
                "&t=" +
                Date.now()
            );


        if (
            !response.ok
        ) {

            throw new Error(
                "Không thể tải Google Sheets."
            );

        }


        const csvText =
            await response.text();


        const rows =
            parseCSV(csvText);


        if (
            rows.length === 0
        ) {

            throw new Error(
                "Google Sheets chưa có dữ liệu."
            );

        }


        allData = [];


        // =============================================
        // CHUYỂN TỪNG DÒNG
        // =============================================

        rows.forEach(
            function(row) {

                const timeValue =
                    row["Thoi_gian"];


                const date =
                    parseVietnameseDate(
                        timeValue
                    );


                if (
                    !date
                ) {

                    return;

                }


                const co2Raw =
                    row["CO2"];


                // Bỏ dòng TEST

                if (
                    String(co2Raw)
                        .trim()
                        .toUpperCase()
                    ===
                    "TEST"
                ) {

                    return;

                }


                const temperature =
                    parseNumber(
                        row["Nhiet_do"]
                    );


                const humidity =
                    parseNumber(
                        row["Do_am"]
                    );


                const co2 =
                    parseNumber(
                        row["CO2"]
                    );


                const pm25 =
                    parseNumber(
                        row["PM2.5"]
                    );


                const people =
                    parseNumber(
                        row["So_nguoi"]
                    );


                if (
                    !Number.isFinite(co2)
                ) {

                    return;

                }


                allData.push({

                    time:
                        date,

                    temperature:
                        Number.isFinite(
                            temperature
                        )
                            ? temperature
                            : 0,

                    humidity:
                        Number.isFinite(
                            humidity
                        )
                            ? humidity
                            : 0,

                    co2:
                        co2,

                    pm25:
                        Number.isFinite(
                            pm25
                        )
                            ? pm25
                            : 0,

                    people:
                        Number.isFinite(
                            people
                        )
                            ? people
                            : 0

                });

            }
        );


        // =============================================
        // SẮP XẾP
        // =============================================

        allData.sort(
            function(a, b) {

                return (
                    a.time.getTime() -
                    b.time.getTime()
                );

            }
        );


        console.log(
            "Số mẫu DATA:",
            allData.length
        );


        if (
            allData.length === 0
        ) {

            throw new Error(
                "Không có dữ liệu cảm biến hợp lệ."
            );

        }


        // =============================================
        // DASHBOARD
        // =============================================

        updateDashboard();


        // =============================================
        // BIỂU ĐỒ
        // =============================================

        updateCharts();


        // =============================================
        // AI REALTIME
        // =============================================

        await loadAIRealtime();


        // =============================================
        // LỊCH SỬ AI
        // =============================================

        await loadAIHistory();


    }

    catch (error) {

        console.error(
            "Lỗi tải dữ liệu:",
            error
        );


        const lastUpdate =
            document.getElementById(
                "lastUpdate"
            );


        if (
            lastUpdate
        ) {

            lastUpdate.innerText =
                "Không thể tải dữ liệu";

        }

    }

}


// =====================================================
// ĐỌC AI REALTIME
// =====================================================

async function loadAIRealtime() {

    try {

        console.log(
            "Đang tải kết quả AI realtime..."
        );


        const response =
            await fetch(

                SCRIPT_URL +
                "?action=get_ai_realtime&t=" +
                Date.now()

            );


        if (
            !response.ok
        ) {

            throw new Error(
                "Không thể tải dữ liệu AI."
            );

        }


        const result =
            await response.json();


        console.log(
            "Kết quả AI:",
            result
        );


        if (
            result.status !== "OK" ||
            !result.data
        ) {

            updateAIUnavailable();

            return;

        }


        updateAIRealtime(
            result.data
        );

    }

    catch (error) {

        console.error(
            "Lỗi đọc AI:",
            error
        );


        updateAIUnavailable();

    }

}


// =====================================================
// CẬP NHẬT GIAO DIỆN AI
// =====================================================

function updateAIRealtime(ai) {

    // =============================================
    // CO2 DỰ BÁO
    // =============================================

    const predictionElement =
        document.getElementById(
            "aiCo2Prediction"
        );


    const prediction =
        convertToNumber(
            ai.co2_du_bao_10phut
        );


    if (
        predictionElement
    ) {

        predictionElement.innerText =
            Math.round(
                prediction
            );

    }


    // =============================================
    // THAY ĐỔI
    // =============================================

    const changeElement =
        document.getElementById(
            "aiCo2Change"
        );


    const change =
        convertToNumber(
            ai.thay_doi_du_bao
        );


    if (
        changeElement
    ) {

        const rounded =
            Math.round(change);


        if (
            rounded > 0
        ) {

            changeElement.innerText =
                "+" +
                rounded;

        }

        else {

            changeElement.innerText =
                rounded;

        }

    }


    // =============================================
    // CẢNH BÁO
    // =============================================

    const alertElement =
        document.getElementById(
            "aiAlert"
        );


    const alert =
        String(
            ai.canh_bao_ai ||
            "--"
        ).toUpperCase();


    if (
        alertElement
    ) {

        if (
            alert === "RED"
        ) {

            alertElement.innerText =
                "🔴 ĐỎ";

        }

        else if (
            alert === "YELLOW"
        ) {

            alertElement.innerText =
                "🟡 VÀNG";

        }

        else if (
            alert === "GREEN"
        ) {

            alertElement.innerText =
                "🟢 XANH";

        }

        else {

            alertElement.innerText =
                alert;

        }

    }


    // =============================================
    // TRẠNG THÁI AI
    // =============================================

    const aiStatus =
        document.getElementById(
            "aiStatus"
        );


    if (
        aiStatus
    ) {

        if (
            alert === "RED"
        ) {

            aiStatus.innerHTML =
                "🔴 AI DỰ BÁO: CẦN CẢNH BÁO";

            aiStatus.className =
                "air-status ai-red";

        }

        else if (
            alert === "YELLOW"
        ) {

            aiStatus.innerHTML =
                "🟡 AI DỰ BÁO: CẦN CHÚ Ý";

            aiStatus.className =
                "air-status ai-yellow";

        }

        else if (
            alert === "GREEN"
        ) {

            aiStatus.innerHTML =
                "🟢 AI DỰ BÁO: AN TOÀN";

            aiStatus.className =
                "air-status ai-green";

        }

        else {

            aiStatus.innerHTML =
                "🤖 AI ĐANG PHÂN TÍCH";

            aiStatus.className =
                "air-status";

        }

    }


    // =============================================
    // HÀNH ĐỘNG
    // =============================================

    const actionElement =
        document.getElementById(
            "aiAction"
        );


    if (
        actionElement
    ) {

        actionElement.innerText =
            ai.hanh_dong ||
            "--";

    }


    // =============================================
    // LÝ DO
    // =============================================

    const reasonElement =
        document.getElementById(
            "aiReason"
        );


    if (
        reasonElement
    ) {

        reasonElement.innerText =
            ai.ly_do ||
            "--";

    }


    // =============================================
    // THỜI GIAN AI
    // =============================================

    const aiTimeElement =
        document.getElementById(
            "aiUpdateTime"
        );


    if (
        aiTimeElement
    ) {

        const aiDate =
            parseAIHistoryDate(
                ai.thoi_gian
            );


        if (
            aiDate
        ) {

            aiTimeElement.innerText =
                "AI cập nhật: " +
                aiDate.toLocaleString(
                    "vi-VN"
                );

        }

        else {

            aiTimeElement.innerText =
                "AI cập nhật: " +
                (
                    ai.thoi_gian ||
                    "--"
                );

        }

    }

}


// =====================================================
// KHI CHƯA CÓ AI
// =====================================================

function updateAIUnavailable() {

    const prediction =
        document.getElementById(
            "aiCo2Prediction"
        );


    const change =
        document.getElementById(
            "aiCo2Change"
        );


    const alertElement =
        document.getElementById(
            "aiAlert"
        );


    const status =
        document.getElementById(
            "aiStatus"
        );


    const action =
        document.getElementById(
            "aiAction"
        );


    const reason =
        document.getElementById(
            "aiReason"
        );


    const time =
        document.getElementById(
            "aiUpdateTime"
        );


    if (
        prediction
    ) {

        prediction.innerText =
            "--";

    }


    if (
        change
    ) {

        change.innerText =
            "--";

    }


    if (
        alertElement
    ) {

        alertElement.innerText =
            "--";

    }


    if (
        status
    ) {

        status.innerText =
            "🤖 Chưa có dữ liệu AI";

        status.className =
            "air-status";

    }


    if (
        action
    ) {

        action.innerText =
            "Đang chờ dữ liệu AI...";

    }


    if (
        reason
    ) {

        reason.innerText =
            "--";

    }


    if (
        time
    ) {

        time.innerText =
            "Chưa có dữ liệu AI";

    }

}


// =====================================================
// ĐỌC LỊCH SỬ AI
// =====================================================

async function loadAIHistory() {

    try {

        console.log(
            "Đang tải lịch sử AI..."
        );


        const response =
            await fetch(

                SCRIPT_URL +
                "?action=get_ai_realtime_history&t=" +
                Date.now()

            );


        if (
            !response.ok
        ) {

            throw new Error(
                "Không thể tải lịch sử AI."
            );

        }


        const result =
            await response.json();


        console.log(
            "Lịch sử AI:",
            result
        );


        // =============================================
        // XỬ LÝ NHIỀU KIỂU RESPONSE
        // =============================================

        let history = [];


        if (
            Array.isArray(result)
        ) {

            history =
                result;

        }

        else if (
            Array.isArray(result.data)
        ) {

            history =
                result.data;

        }

        else if (
            Array.isArray(result.rows)
        ) {

            history =
                result.rows;

        }


        aiHistoryData =
            history.filter(
                function(item) {

                    const time =
                        getAIValue(
                            item,
                            [
                                "thoi_gian",
                                "Thoi_gian",
                                "timestamp",
                                "time"
                            ]
                        );


                    const prediction =
                        getAIValue(
                            item,
                            [
                                "co2_du_bao_10phut",
                                "CO2_du_bao_10phut"
                            ]
                        );


                    return (
                        parseAIHistoryDate(
                            time
                        ) !== null &&
                        Number.isFinite(
                            convertToNumber(
                                prediction
                            )
                        )
                    );

                }
            );


        console.log(
            "Số điểm AI hợp lệ:",
            aiHistoryData.length
        );


        // =============================================
        // VẼ BIỂU ĐỒ AI
        // =============================================

        updateAIChart();

    }

    catch (error) {

        console.error(
            "Lỗi đọc lịch sử AI:",
            error
        );


        aiHistoryData = [];


        updateAIChart();

    }

}


// =====================================================
// DASHBOARD
// =====================================================

function updateDashboard() {

    if (
        allData.length === 0
    ) {

        return;

    }


    const latest =
        allData[
            allData.length - 1
        ];


    // =============================================
    // THỜI GIAN
    // =============================================

    const lastUpdate =
        document.getElementById(
            "lastUpdate"
        );


    if (
        lastUpdate
    ) {

        lastUpdate.innerText =
            latest.time.toLocaleString(
                "vi-VN"
            );

    }


    // =============================================
    // NHIỆT ĐỘ
    // =============================================

    const temperature =
        document.getElementById(
            "temperature"
        );


    if (
        temperature
    ) {

        temperature.innerText =
            latest.temperature.toFixed(1);

    }


    // =============================================
    // ĐỘ ẨM
    // =============================================

    const humidity =
        document.getElementById(
            "humidity"
        );


    if (
        humidity
    ) {

        humidity.innerText =
            latest.humidity.toFixed(1);

    }


    // =============================================
    // CO2
    // =============================================

    const co2 =
        document.getElementById(
            "co2"
        );


    if (
        co2
    ) {

        co2.innerText =
            Math.round(
                latest.co2
            );

    }


    // =============================================
    // PM2.5
    // =============================================

    const pm25 =
        document.getElementById(
            "pm25"
        );


    if (
        pm25
    ) {

        pm25.innerText =
            latest.pm25.toFixed(1);

    }


    // =============================================
    // SỐ NGƯỜI
    // =============================================

    const people =
        document.getElementById(
            "people"
        );


    if (
        people
    ) {

        people.innerText =
            Math.round(
                latest.people
            );

    }


    // =============================================
    // INPUT SỐ NGƯỜI
    // =============================================

    const peopleInput =
        document.getElementById(
            "peopleInput"
        );


    if (
        peopleInput
    ) {

        peopleInput.value =
            Math.round(
                latest.people
            );

    }


    // =============================================
    // TRẠNG THÁI KHÔNG KHÍ
    // =============================================

    updateAirStatus(
        latest.co2,
        latest.pm25
    );

}


// =====================================================
// TRẠNG THÁI KHÔNG KHÍ
// =====================================================

function updateAirStatus(
    co2,
    pm25
) {

    const statusElement =
        document.getElementById(
            "airStatus"
        );


    if (
        !statusElement
    ) {

        return;

    }


    // =============================================
    // CO2 CAO
    // =============================================

    if (
        co2 > 800
    ) {

        statusElement.innerHTML =
            "🔴 CO₂ CAO - CẦN TĂNG THÔNG GIÓ";

        statusElement.className =
            "air-status air-red";

        return;

    }


    // =============================================
    // PM2.5 CAO
    // =============================================

    if (
        pm25 > 12
    ) {

        statusElement.innerHTML =
            "🟡 PM2.5 CAO - CẦN CHÚ Ý";

        statusElement.className =
            "air-status air-yellow";

        return;

    }


    // =============================================
    // AN TOÀN
    // =============================================

    statusElement.innerHTML =
        "🟢 CHẤT LƯỢNG KHÔNG KHÍ BÌNH THƯỜNG";

    statusElement.className =
        "air-status air-green";

}


// =====================================================
// LỌC DỮ LIỆU THEO THỜI GIAN
// =====================================================

function getFilteredData() {

    if (
        allData.length === 0
    ) {

        return [];

    }


    if (
        currentTimeRange === "all"
    ) {

        return allData;

    }


    const latestTime =
        allData[
            allData.length - 1
        ].time.getTime();


    let milliseconds =
        60 * 60 * 1000;


    if (
        currentTimeRange === "6h"
    ) {

        milliseconds =
            6 *
            60 *
            60 *
            1000;

    }

    else if (
        currentTimeRange === "24h"
    ) {

        milliseconds =
            24 *
            60 *
            60 *
            1000;

    }

    else if (
        currentTimeRange === "7d"
    ) {

        milliseconds =
            7 *
            24 *
            60 *
            60 *
            1000;

    }


    const startTime =
        latestTime -
        milliseconds;


    return allData.filter(
        function(item) {

            return (
                item.time.getTime() >=
                startTime
            );

        }
    );

}


// =====================================================
// THAY ĐỔI KHOẢNG THỜI GIAN
// =====================================================

function changeTimeRange(
    range,
    button
) {

    currentTimeRange =
        range;


    const buttons =
        document.querySelectorAll(
            ".time-button"
        );


    buttons.forEach(
        function(btn) {

            btn.classList.remove(
                "active"
            );

        }
    );


    if (
        button
    ) {

        button.classList.add(
            "active"
        );

    }


    updateCharts();

    updateAIChart();

}


// =====================================================
// ĐỊNH DẠNG NHÃN THỜI GIAN
// =====================================================

function formatChartTime(
    date
) {

    if (
        currentTimeRange === "7d" ||
        currentTimeRange === "all"
    ) {

        return date.toLocaleString(
            "vi-VN",
            {

                day:
                    "2-digit",

                month:
                    "2-digit",

                hour:
                    "2-digit",

                minute:
                    "2-digit"

            }
        );

    }


    return date.toLocaleTimeString(
        "vi-VN",
        {

            hour:
                "2-digit",

            minute:
                "2-digit",

            second:
                "2-digit"

        }
    );

}


// =====================================================
// CẬP NHẬT TẤT CẢ BIỂU ĐỒ
// =====================================================

function updateCharts() {

    const filteredData =
        getFilteredData();


    if (
        filteredData.length === 0
    ) {

        return;

    }


    const labels =
        filteredData.map(
            function(item) {

                return formatChartTime(
                    item.time
                );

            }
        );


    const co2Data =
        filteredData.map(
            function(item) {

                return item.co2;

            }
        );


    const pm25Data =
        filteredData.map(
            function(item) {

                return item.pm25;

            }
        );


    const peopleData =
        filteredData.map(
            function(item) {

                return item.people;

            }
        );


    createCo2Chart(
        labels,
        co2Data
    );


    createPm25Chart(
        labels,
        pm25Data
    );


    createPeopleChart(
        labels,
        peopleData
    );

}


// =====================================================
// BIỂU ĐỒ CO2
// =====================================================

function createCo2Chart(
    labels,
    data
) {

    const canvas =
        document.getElementById(
            "co2Chart"
        );


    if (
        !canvas
    ) {

        return;

    }


    const context =
        canvas.getContext(
            "2d"
        );


    if (
        co2Chart
    ) {

        co2Chart.destroy();

    }


    const validData =
        data.filter(
            function(value) {

                return Number.isFinite(
                    value
                );

            }
        );


    if (
        validData.length === 0
    ) {

        return;

    }


    const minValue =
        Math.min(
            ...validData
        );


    const maxValue =
        Math.max(
            ...validData
        );


    const padding =
        Math.max(
            100,
            (
                maxValue -
                minValue
            ) *
            0.15
        );


    co2Chart =
        new Chart(
            context,
            {

                type:
                    "line",

                data:
                    {

                        labels:
                            labels,

                        datasets:
                            [

                                {

                                    label:
                                        "CO₂ (ppm)",

                                    data:
                                        data,

                                    borderWidth:
                                        2,

                                    tension:
                                        0.25,

                                    pointRadius:
                                        1,

                                    pointHoverRadius:
                                        5,

                                    fill:
                                        false

                                }

                            ]

                    },

                options:
                    {

                        responsive:
                            true,

                        maintainAspectRatio:
                            true,

                        interaction:
                            {

                                mode:
                                    "index",

                                intersect:
                                    false

                            },

                        plugins:
                            {

                                legend:
                                    {

                                        display:
                                            true

                                    }

                            },

                        scales:
                            {

                                x:
                                    {

                                        ticks:
                                            {

                                                maxTicksLimit:
                                                    10,

                                                maxRotation:
                                                    0,

                                                autoSkip:
                                                    true

                                            }

                                    },

                                y:
                                    {

                                        beginAtZero:
                                            false,

                                        suggestedMin:
                                            Math.max(
                                                0,
                                                minValue -
                                                padding
                                            ),

                                        suggestedMax:
                                            maxValue +
                                            padding

                                    }

                            }

                    }

            }
        );

}


// =====================================================
// BIỂU ĐỒ PM2.5
// =====================================================

function createPm25Chart(
    labels,
    data
) {

    const canvas =
        document.getElementById(
            "pm25Chart"
        );


    if (
        !canvas
    ) {

        return;

    }


    const context =
        canvas.getContext(
            "2d"
        );


    if (
        pm25Chart
    ) {

        pm25Chart.destroy();

    }


    const validData =
        data.filter(
            function(value) {

                return Number.isFinite(
                    value
                );

            }
        );


    if (
        validData.length === 0
    ) {

        return;

    }


    const minValue =
        Math.min(
            ...validData
        );


    const maxValue =
        Math.max(
            ...validData
        );


    const padding =
        Math.max(
            2,
            (
                maxValue -
                minValue
            ) *
            0.15
        );


    pm25Chart =
        new Chart(
            context,
            {

                type:
                    "line",

                data:
                    {

                        labels:
                            labels,

                        datasets:
                            [

                                {

                                    label:
                                        "PM2.5 (µg/m³)",

                                    data:
                                        data,

                                    borderWidth:
                                        2,

                                    tension:
                                        0.25,

                                    pointRadius:
                                        1,

                                    pointHoverRadius:
                                        5,

                                    fill:
                                        false

                                }

                            ]

                    },

                options:
                    {

                        responsive:
                            true,

                        maintainAspectRatio:
                            true,

                        interaction:
                            {

                                mode:
                                    "index",

                                intersect:
                                    false

                            },

                        plugins:
                            {

                                legend:
                                    {

                                        display:
                                            true

                                    }

                            },

                        scales:
                            {

                                x:
                                    {

                                        ticks:
                                            {

                                                maxTicksLimit:
                                                    10,

                                                maxRotation:
                                                    0,

                                                autoSkip:
                                                    true

                                            }

                                    },

                                y:
                                    {

                                        beginAtZero:
                                            false,

                                        suggestedMin:
                                            Math.max(
                                                0,
                                                minValue -
                                                padding
                                            ),

                                        suggestedMax:
                                            maxValue +
                                            padding

                                    }

                            }

                    }

            }
        );

}


// =====================================================
// BIỂU ĐỒ SỐ NGƯỜI
// =====================================================

function createPeopleChart(
    labels,
    data
) {

    const canvas =
        document.getElementById(
            "peopleChart"
        );


    if (
        !canvas
    ) {

        return;

    }


    const context =
        canvas.getContext(
            "2d"
        );


    if (
        peopleChart
    ) {

        peopleChart.destroy();

    }


    peopleChart =
        new Chart(
            context,
            {

                type:
                    "line",

                data:
                    {

                        labels:
                            labels,

                        datasets:
                            [

                                {

                                    label:
                                        "Số người",

                                    data:
                                        data,

                                    borderWidth:
                                        2,

                                    tension:
                                        0.2,

                                    pointRadius:
                                        1,

                                    pointHoverRadius:
                                        5,

                                    fill:
                                        false

                                },

                                {

                                    label:
                                        "Ngưỡng đông người (20 người)",

                                    data:
                                        labels.map(
                                            function() {

                                                return 20;

                                            }
                                        ),

                                    borderDash:
                                        [5, 5],

                                    borderWidth:
                                        1,

                                    pointRadius:
                                        0,

                                    fill:
                                        false

                                }

                            ]

                    },

                options:
                    {

                        responsive:
                            true,

                        maintainAspectRatio:
                            true,

                        interaction:
                            {

                                mode:
                                    "index",

                                intersect:
                                    false

                            },

                        plugins:
                            {

                                legend:
                                    {

                                        display:
                                            true

                                    }

                            },

                        scales:
                            {

                                x:
                                    {

                                        ticks:
                                            {

                                                maxTicksLimit:
                                                    10,

                                                maxRotation:
                                                    0,

                                                autoSkip:
                                                    true

                                            }

                                    },

                                y:
                                    {

                                        beginAtZero:
                                            true,

                                        ticks:
                                            {

                                                precision:
                                                    0

                                            }

                                    }

                            }

                    }

            }
        );

}


// =====================================================
// TÌM MẪU CO2 THỰC TẾ GẦN NHẤT
// =====================================================
//
// targetTime = thời điểm AI dự báo
// + 10 phút
//
// Chỉ chấp nhận sai lệch tối đa ±2 phút
// =====================================================

function findNearestActual(
    targetTimeMs
) {

    if (
        allData.length === 0
    ) {

        return null;

    }


    let nearest =
        null;

    let nearestDifference =
        Infinity;


    for (
        const sensor of allData
    ) {

        const sensorTimeMs =
            sensor.time.getTime();


        const difference =
            Math.abs(
                sensorTimeMs -
                targetTimeMs
            );


        if (
            difference <
            nearestDifference
        ) {

            nearestDifference =
                difference;

            nearest =
                sensor;

        }

    }


    if (
        !nearest
    ) {

        return null;

    }


    if (
        nearestDifference >
        2 * 60 * 1000
    ) {

        return null;

    }


    return {

        sensor:
            nearest,

        difference:
            nearestDifference

    };

}


// =====================================================
// TẠO DỮ LIỆU BIỂU ĐỒ AI
// =====================================================
//
// AI tại thời điểm t
//        ↓
// dự báo CO2 tại t + 10 phút
//
// CO2 thực tế được đặt ở đúng thời điểm
// cảm biến đo tại t + 10 phút.
//
// Vì vậy đường AI đi trước đường thực tế.
// =====================================================

function buildAIChartData() {

    if (
        aiHistoryData.length === 0 ||
        allData.length === 0
    ) {

        return null;

    }


    const latestTime =
        allData[
            allData.length - 1
        ].time.getTime();


    let rangeMilliseconds =
        60 *
        60 *
        1000;


    if (
        currentTimeRange === "6h"
    ) {

        rangeMilliseconds =
            6 *
            60 *
            60 *
            1000;

    }

    else if (
        currentTimeRange === "24h"
    ) {

        rangeMilliseconds =
            24 *
            60 *
            60 *
            1000;

    }

    else if (
        currentTimeRange === "7d"
    ) {

        rangeMilliseconds =
            7 *
            24 *
            60 *
            60 *
            1000;

    }

    else if (
        currentTimeRange === "all"
    ) {

        rangeMilliseconds =
            Infinity;

    }


    const startTime =
        currentTimeRange === "all"
            ? -Infinity
            : latestTime -
              rangeMilliseconds;


    const points = [];


    // =============================================
    // XỬ LÝ TỪNG ĐIỂM AI
    // =============================================

    aiHistoryData.forEach(
        function(item) {

            const timeValue =
                getAIValue(
                    item,
                    [
                        "thoi_gian",
                        "Thoi_gian",
                        "timestamp",
                        "time"
                    ]
                );


            const predictionValue =
                getAIValue(
                    item,
                    [
                        "co2_du_bao_10phut",
                        "CO2_du_bao_10phut"
                    ]
                );


            const aiTime =
                parseAIHistoryDate(
                    timeValue
                );


            const prediction =
                convertToNumber(
                    predictionValue
                );


            if (
                !aiTime ||
                !Number.isFinite(
                    prediction
                )
            ) {

                return;

            }


            const aiTimeMs =
                aiTime.getTime();


            // AI nằm trong khoảng đang xem

            if (
                aiTimeMs < startTime ||
                aiTimeMs > latestTime
            ) {

                return;

            }


            // =============================================
            // THỜI ĐIỂM AI DỰ BÁO
            // =============================================

            const targetTimeMs =
                aiTimeMs +
                10 *
                60 *
                1000;


            // =============================================
            // TÌM CO2 THỰC TẾ
            // =============================================

            const nearest =
                findNearestActual(
                    targetTimeMs
                );


            if (
                !nearest
            ) {

                // Chưa đến thời điểm t+10
                // hoặc không có dữ liệu phù hợp

                return;

            }


            points.push({

                aiTime:
                    aiTime,

                aiTimeMs:
                    aiTimeMs,

                prediction:
                    prediction,

                actualTime:
                    nearest.sensor.time,

                actualTimeMs:
                    nearest.sensor.time.getTime(),

                actual:
                    nearest.sensor.co2

            });

        }
    );


    if (
        points.length === 0
    ) {

        return null;

    }


    points.sort(
        function(a, b) {

            return (
                a.aiTimeMs -
                b.aiTimeMs
            );

        }
    );


    return points;

}


// =====================================================
// BIỂU ĐỒ CO2 AI + CO2 THỰC TẾ
// =====================================================
//
// Đây là phần quan trọng đã sửa.
//
// KHÔNG dùng Date làm x-axis kiểu linear.
//
// Dùng labels thời gian thông thường của Chart.js.
//
// AI:
// t -> dự báo t+10
//
// Thực tế:
// t+10 -> giá trị cảm biến thực tế
//
// Hai đường nằm cùng một biểu đồ.
// =====================================================

function updateAIChart() {

    const canvas =
        document.getElementById(
            "aiCo2Chart"
        );


    if (
        !canvas
    ) {

        console.log(
            "Không tìm thấy aiCo2Chart."
        );

        return;

    }


    if (
        aiCo2Chart
    ) {

        aiCo2Chart.destroy();

        aiCo2Chart =
            null;

    }


    const points =
        buildAIChartData();


    if (
        !points ||
        points.length === 0
    ) {

        console.log(
            "Chưa có đủ dữ liệu AI để vẽ."
        );

        return;

    }


    // =============================================
    // TẠO TRỤC THỜI GIAN
    // =============================================

    const timeMap =
        new Map();


    points.forEach(
        function(point) {

            timeMap.set(
                point.aiTimeMs,
                point.aiTime
            );


            timeMap.set(
                point.actualTimeMs,
                point.actualTime
            );

        }
    );


    const sortedTimes =
        Array.from(
            timeMap.keys()
        ).sort(
            function(a, b) {

                return a - b;

            }
        );


    // =============================================
    // NHÃN X
    // =============================================

    const labels =
        sortedTimes.map(
            function(timeMs) {

                return formatChartTime(
                    new Date(timeMs)
                );

            }
        );


    // =============================================
    // DỮ LIỆU AI
    // =============================================

    const aiData =
        new Array(
            sortedTimes.length
        ).fill(null);


    // =============================================
    // DỮ LIỆU THỰC TẾ
    // =============================================

    const actualData =
        new Array(
            sortedTimes.length
        ).fill(null);


    // =============================================
    // ĐƯA AI VÀO ĐÚNG THỜI ĐIỂM t
    // =============================================

    points.forEach(
        function(point) {

            const index =
                sortedTimes.indexOf(
                    point.aiTimeMs
                );


            if (
                index !== -1
            ) {

                aiData[index] =
                    point.prediction;

            }

        }
    );


    // =============================================
    // ĐƯA THỰC TẾ VÀO ĐÚNG THỜI ĐIỂM t+10
    // =============================================

    points.forEach(
        function(point) {

            const index =
                sortedTimes.indexOf(
                    point.actualTimeMs
                );


            if (
                index !== -1
            ) {

                actualData[index] =
                    point.actual;

            }

        }
    );


    console.log(
        "Số điểm biểu đồ AI:",
        points.length
    );


    // =============================================
    // TẠO BIỂU ĐỒ
    // =============================================

    aiCo2Chart =
        new Chart(
            canvas.getContext(
                "2d"
            ),
            {

                type:
                    "line",

                data:
                    {

                        labels:
                            labels,

                        datasets:
                            [

                                // ---------------------------------
                                // AI
                                // ---------------------------------

                                {

                                    label:
                                        "CO₂ AI dự đoán",

                                    data:
                                        aiData,

                                    borderColor:
                                        "#1683e8",

                                    backgroundColor:
                                        "#1683e8",

                                    borderWidth:
                                        3,

                                    tension:
                                        0.2,

                                    pointRadius:
                                        1.5,

                                    pointHoverRadius:
                                        5,

                                    fill:
                                        false,

                                    spanGaps:
                                        false

                                },


                                // ---------------------------------
                                // THỰC TẾ
                                // ---------------------------------

                                {

                                    label:
                                        "CO₂ thực tế",

                                    data:
                                        actualData,

                                    borderColor:
                                        "#ef3b32",

                                    backgroundColor:
                                        "#ef3b32",

                                    borderWidth:
                                        3,

                                    tension:
                                        0.2,

                                    pointRadius:
                                        1.5,

                                    pointHoverRadius:
                                        5,

                                    fill:
                                        false,

                                    spanGaps:
                                        false

                                }

                            ]

                    },


                options:
                    {

                        responsive:
                            true,

                        maintainAspectRatio:
                            true,

                        interaction:
                            {

                                mode:
                                    "index",

                                intersect:
                                    false

                            },


                        plugins:
                            {

                                legend:
                                    {

                                        display:
                                            true,

                                        position:
                                            "top"

                                    },


                                tooltip:
                                    {

                                        mode:
                                            "index",

                                        intersect:
                                            false

                                    }

                            },


                        scales:
                            {

                                x:
                                    {

                                        ticks:
                                            {

                                                maxTicksLimit:
                                                    10,

                                                maxRotation:
                                                    0,

                                                autoSkip:
                                                    true

                                            },

                                        title:
                                            {

                                                display:
                                                    true,

                                                text:
                                                    "Thời gian"

                                            }

                                    },


                                y:
                                    {

                                        beginAtZero:
                                            false,

                                        title:
                                            {

                                                display:
                                                    true,

                                                text:
                                                    "CO₂ (ppm)"

                                            }

                                    }

                            }

                    }

            }
        );

}


// =====================================================
// CẬP NHẬT SỐ NGƯỜI
// =====================================================

async function updatePeople() {

    const input =
        document.getElementById(
            "peopleInput"
        );


    if (
        !input
    ) {

        return;

    }


    const people =
        Number(
            input.value
        );


    if (
        !Number.isFinite(people) ||
        people < 0
    ) {

        alert(
            "Số người không hợp lệ!"
        );

        return;

    }


    try {

        const response =
            await fetch(
                SCRIPT_URL,
                {

                    method:
                        "POST",

                    headers:
                        {

                            "Content-Type":
                                "text/plain;charset=utf-8"

                        },

                    body:
                        JSON.stringify(
                            {

                                action:
                                    "set_people",

                                so_nguoi:
                                    Math.round(
                                        people
                                    )

                            }
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
            "✅ Đã gửi lệnh cập nhật số người: " +
            Math.round(people)
        );


        const peopleElement =
            document.getElementById(
                "people"
            );


        if (
            peopleElement
        ) {

            peopleElement.innerText =
                Math.round(
                    people
                );

        }

    }

    catch (error) {

        console.error(
            error
        );


        alert(
            "❌ Không thể gửi lệnh cập nhật số người!"
        );

    }

}


// =====================================================
// CHẾ ĐỘ LED
// =====================================================

async function setLedMode(
    mode
) {

    try {

        await sendLedCommand({

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
            "💡 Đã chuyển sang chế độ " +
            mode
        );

    }

    catch (error) {

        console.error(
            error
        );


        alert(
            "❌ Không thể điều khiển LED."
        );

    }

}


// =====================================================
// ĐIỀU KHIỂN TỪNG LED
// =====================================================

async function setLed(
    color,
    state
) {

    const command = {

        mode:
            "MANUAL",

        red:
            "OFF",

        yellow:
            "OFF",

        green:
            "OFF"

    };


    if (
        color === "red" ||
        color === "yellow" ||
        color === "green"
    ) {

        command[color] =
            state;

    }

    else {

        alert(
            "LED không hợp lệ."
        );

        return;

    }


    try {

        await sendLedCommand(
            command
        );


        alert(
            "💡 Đã gửi lệnh LED " +
            color +
            " = " +
            state
        );

    }

    catch (error) {

        console.error(
            error
        );


        alert(
            "❌ Không thể điều khiển LED."
        );

    }

}


// =====================================================
// GỬI LỆNH LED
// =====================================================

async function sendLedCommand(
    command
) {

    const response =
        await fetch(
            SCRIPT_URL,
            {

                method:
                    "POST",

                headers:
                    {

                        "Content-Type":
                            "text/plain;charset=utf-8"

                    },

                body:
                    JSON.stringify(
                        {

                            action:
                                "set_led",

                            mode:
                                command.mode,

                            red:
                                command.red,

                            yellow:
                                command.yellow,

                            green:
                                command.green

                        }
                    )

            }
        );


    if (
        !response.ok
    ) {

        throw new Error(
            "Không thể gửi lệnh LED."
        );

    }


    return await response.text();

}


// =====================================================
// KHỞI ĐỘNG DASHBOARD
// =====================================================

loadData();


// =====================================================
// TỰ ĐỘNG CẬP NHẬT
// =====================================================
//
// 30 giây:
// - DATA
// - AI realtime
// - AI history
//
// Điều này phù hợp với Cell AI realtime
// đang cập nhật khoảng 30 giây/lần.
// =====================================================

setInterval(
    loadData,
    30000
);
