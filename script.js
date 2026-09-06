// =====================================================
// CẤU HÌNH GOOGLE APPS SCRIPT
// =====================================================

const SCRIPT_URL =
    "https://script.google.com/macros/s/" +
    "AKfycbw5JwJ9Kil9T9ul12UqJ8mXen4l0Exdq4HJaHDK7ZEKdRYy58cBoyEBd9-ynVZo1somoA/" +
    "exec";


// =====================================================
// CẤU HÌNH GOOGLE SHEETS CSV
// =====================================================

const SHEET_URL =
    "https://docs.google.com/spreadsheets/d/" +
    "1Y_1yX00pbMFD416BXNSe2ClxGGGUK2kdps93Pz7Agh4/" +
    "export?format=csv&gid=0";


// =====================================================
// BIẾN LƯU DỮ LIỆU
// =====================================================

let allData = [];

let currentTimeRange = "1h";


// =====================================================
// BIẾN BIỂU ĐỒ
// =====================================================

let co2Chart = null;

let pm25Chart = null;

let peopleChart = null;


// =====================================================
// TRẠNG THÁI LED
// =====================================================

let currentLedMode = "AUTO";

let ledState = {

    red: "OFF",

    yellow: "OFF",

    green: "OFF"

};


// =====================================================
// HÀM CHUYỂN GIÁ TRỊ SANG SỐ
//
// Hỗ trợ:
// 27,68
// 27.68
// "27,68"
// =====================================================

function convertToNumber(value) {

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {

        return NaN;

    }


    let text =
        String(value)
            .trim()
            .replace(/"/g, "");


    text =
        text.replace(",", ".");


    const number =
        Number(text);


    return Number.isFinite(number)
        ? number
        : NaN;

}


// =====================================================
// HÀM ĐỌC MỘT DÒNG CSV
//
// Hỗ trợ:
// "27,68"
// "06/09/2026 11:28:44"
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


        // ---------------------------------------------
        // XỬ LÝ DẤU NGOẶC KÉP
        // ---------------------------------------------

        if (
            character === '"'
        ) {

            // Hai dấu "" liên tiếp
            // đại diện cho một dấu "
            if (
                insideQuotes &&
                line[i + 1] === '"'
            ) {

                current += '"';

                i++;

            }

            else {

                insideQuotes =
                    !insideQuotes;

            }

        }


        // ---------------------------------------------
        // DẤU PHẨY PHÂN CÁCH CỘT
        //
        // Chỉ có hiệu lực khi không nằm trong ""
        // ---------------------------------------------

        else if (
            character === "," &&
            !insideQuotes
        ) {

            result.push(
                current.trim()
            );


            current = "";

        }


        // ---------------------------------------------
        // KÝ TỰ THÔNG THƯỜNG
        // ---------------------------------------------

        else {

            current += character;

        }

    }


    // Thêm cột cuối cùng

    result.push(
        current.trim()
    );


    return result;

}


// =====================================================
// HÀM ĐỌC TOÀN BỘ CSV
// =====================================================

function parseCSV(csvText) {

    const lines =
        csvText
            .trim()
            .split(/\r?\n/)
            .filter(
                line =>
                    line.trim() !== ""
            );


    if (
        lines.length < 2
    ) {

        return [];

    }


    // ================================================
    // ĐỌC HEADER
    // ================================================

    const headers =
        parseCSVLine(
            lines[0]
        )
        .map(
            header =>

                header
                    .replace(/"/g, "")
                    .trim()
        );


    console.log(
        "Tên cột CSV:",
        headers
    );


    // ================================================
    // TẠO DỮ LIỆU
    // ================================================

    const data = [];


    for (
        let i = 1;
        i < lines.length;
        i++
    ) {

        const values =
            parseCSVLine(
                lines[i]
            );


        if (
            values.length === 0
        ) {

            continue;

        }


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


        data.push(
            row
        );

    }


    return data;

}


// =====================================================
// ĐỌC THỜI GIAN
//
// Định dạng:
// 06/09/2026 11:28:44
// =====================================================

function parseVietnameseDate(value) {

    if (
        !value
    ) {

        return null;

    }


    const text =
        String(value)
            .trim()
            .replace(/"/g, "");


    // Tách ngày và giờ

    const parts =
        text.split(" ");


    if (
        parts.length < 2
    ) {

        return null;

    }


    const dateParts =
        parts[0].split("/");


    const timeParts =
        parts[1].split(":");


    if (
        dateParts.length !== 3 ||
        timeParts.length < 2
    ) {

        return null;

    }


    const day =
        Number(dateParts[0]);


    const month =
        Number(dateParts[1]) - 1;


    const year =
        Number(dateParts[2]);


    const hour =
        Number(timeParts[0]);


    const minute =
        Number(timeParts[1]);


    const second =
        timeParts.length >= 3

            ? Number(timeParts[2])

            : 0;


    const date =
        new Date(

            year,

            month,

            day,

            hour,

            minute,

            second

        );


    return Number.isNaN(
        date.getTime()
    )

        ? null

        : date;

}


// =====================================================
// TẢI DỮ LIỆU TỪ GOOGLE SHEETS
// =====================================================

async function loadData() {

    try {

        console.log(
            "Đang tải dữ liệu..."
        );


        // Thêm timestamp để tránh cache

        const url =
            SHEET_URL +
            "&t=" +
            Date.now();


        const response =
            await fetch(
                url
            );


        if (
            !response.ok
        ) {

            throw new Error(
                "Không thể tải dữ liệu Google Sheets"
            );

        }


        const csvText =
            await response.text();


        // =============================================
        // PHÂN TÍCH CSV
        // =============================================

        const rawData =
            parseCSV(
                csvText
            );


        if (
            rawData.length === 0
        ) {

            throw new Error(
                "Google Sheets chưa có dữ liệu"
            );

        }


        console.log(
            "Tổng số dòng:",
            rawData.length
        );


        // =============================================
        // XỬ LÝ DỮ LIỆU
        // =============================================

        const processedData =
            rawData
                .map(

                    function(row) {

                        const time =
                            parseVietnameseDate(
                                row["Thoi_gian"]
                            );


                        const temperature =
                            convertToNumber(
                                row["Nhiet_do"]
                            );


                        const humidity =
                            convertToNumber(
                                row["Do_am"]
                            );


                        const co2 =
                            convertToNumber(
                                row["CO2"]
                            );


                        const pm25 =
                            convertToNumber(
                                row["PM2.5"]
                            );


                        const people =
                            convertToNumber(
                                row["So_nguoi"]
                            );


                        return {

                            time:

                                time,


                            temperature:

                                temperature,


                            humidity:

                                humidity,


                            co2:

                                co2,


                            pm25:

                                pm25,


                            people:

                                people

                        };

                    }

                )


                // =====================================
                // LOẠI DÒNG KHÔNG HỢP LỆ
                // =====================================

                .filter(

                    function(item) {

                        return (

                            item.time instanceof Date &&

                            Number.isFinite(
                                item.temperature
                            ) &&

                            Number.isFinite(
                                item.humidity
                            ) &&

                            Number.isFinite(
                                item.co2
                            ) &&

                            Number.isFinite(
                                item.pm25
                            ) &&

                            Number.isFinite(
                                item.people
                            )

                        );

                    }

                );


        if (
            processedData.length === 0
        ) {

            throw new Error(
                "Không có dòng dữ liệu hợp lệ"
            );

        }


        // =============================================
        // SẮP XẾP THEO THỜI GIAN
        // =============================================

        allData =
            processedData.sort(

                function(
                    a,
                    b
                ) {

                    return (
                        a.time -
                        b.time
                    );

                }

            );


        console.log(
            "Dữ liệu hợp lệ:",
            allData.length
        );


        console.log(
            "Dữ liệu mới nhất:",
            allData[
                allData.length - 1
            ]
        );


        // =============================================
        // CẬP NHẬT DASHBOARD
        // =============================================

        updateDashboard();


        // =============================================
        // CẬP NHẬT BIỂU ĐỒ
        // =============================================

        updateCharts();


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

            lastUpdate.textContent =
                "Không thể tải dữ liệu";

        }

    }

}


// =====================================================
// CẬP NHẬT DASHBOARD
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

        lastUpdate.textContent =
            latest.time.toLocaleString(
                "vi-VN"
            );

    }


    // =============================================
    // NHIỆT ĐỘ
    // =============================================

    const temperatureElement =
        document.getElementById(
            "temperature"
        );


    if (
        temperatureElement
    ) {

        temperatureElement.textContent =
            latest.temperature.toFixed(
                1
            );

    }


    // =============================================
    // ĐỘ ẨM
    // =============================================

    const humidityElement =
        document.getElementById(
            "humidity"
        );


    if (
        humidityElement
    ) {

        humidityElement.textContent =
            latest.humidity.toFixed(
                1
            );

    }


    // =============================================
    // CO2
    // =============================================

    const co2Element =
        document.getElementById(
            "co2"
        );


    if (
        co2Element
    ) {

        co2Element.textContent =
            Math.round(
                latest.co2
            );

    }


    // =============================================
    // PM2.5
    // =============================================

    const pm25Element =
        document.getElementById(
            "pm25"
        );


    if (
        pm25Element
    ) {

        pm25Element.textContent =
            latest.pm25.toFixed(
                1
            );

    }


    // =============================================
    // SỐ NGƯỜI
    // =============================================

    const peopleElement =
        document.getElementById(
            "people"
        );


    if (
        peopleElement
    ) {

        peopleElement.textContent =
            Math.round(
                latest.people
            );

    }


    // =============================================
    // Ô HIỆU CHỈNH SỐ NGƯỜI
    // =============================================

    const peopleInput =
        document.getElementById(
            "peopleInput"
        );


    if (
        peopleInput &&
        document.activeElement !== peopleInput
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
// CẬP NHẬT TRẠNG THÁI KHÔNG KHÍ
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


    // CẢNH BÁO

    if (
        co2 >= 1000 ||
        pm25 >= 12
    ) {

        statusElement.textContent =
            "🔴 CHẤT LƯỢNG KHÔNG KHÍ CẦN CẢNH BÁO";


        return;

    }


    // CẦN CHÚ Ý

    if (
        co2 >= 800
    ) {

        statusElement.textContent =
            "🟡 CHẤT LƯỢNG KHÔNG KHÍ CẦN CHÚ Ý";


        return;

    }


    // BÌNH THƯỜNG

    statusElement.textContent =
        "🟢 BÌNH THƯỜNG: Chất lượng không khí tốt";

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


    // TẤT CẢ

    if (
        currentTimeRange === "all"
    ) {

        return allData;

    }


    const latestTime =
        allData[
            allData.length - 1
        ].time.getTime();


    let milliseconds = 0;


    // 1 GIỜ

    if (
        currentTimeRange === "1h"
    ) {

        milliseconds =
            60 *
            60 *
            1000;

    }


    // 6 GIỜ

    else if (
        currentTimeRange === "6h"
    ) {

        milliseconds =
            6 *
            60 *
            60 *
            1000;

    }


    // 24 GIỜ

    else if (
        currentTimeRange === "24h"
    ) {

        milliseconds =
            24 *
            60 *
            60 *
            1000;

    }


    // 7 NGÀY

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


    // Xóa trạng thái active cũ

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


    // Thêm active mới

    if (
        button
    ) {

        button.classList.add(
            "active"
        );

    }


    // Vẽ lại biểu đồ

    updateCharts();

}


// =====================================================
// RÚT GỌN DỮ LIỆU BIỂU ĐỒ
//
// Tránh hàng nghìn điểm dữ liệu
// =====================================================

function reduceChartData(
    data,
    maxPoints = 300
) {

    if (
        data.length <= maxPoints
    ) {

        return data;

    }


    const step =
        Math.ceil(
            data.length /
            maxPoints
        );


    const result = [];


    for (
        let i = 0;
        i < data.length;
        i += step
    ) {

        result.push(
            data[i]
        );

    }


    // Luôn giữ điểm cuối

    const lastItem =
        data[
            data.length - 1
        ];


    if (
        result[
            result.length - 1
        ] !== lastItem
    ) {

        result.push(
            lastItem
        );

    }


    return result;

}


// =====================================================
// ĐỊNH DẠNG THỜI GIAN BIỂU ĐỒ
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
// TÍNH GIỚI HẠN TRỤC Y
// =====================================================

function calculateYAxis(
    values,
    minimumPadding
) {

    const validValues =
        values.filter(
            Number.isFinite
        );


    if (
        validValues.length === 0
    ) {

        return {

            min: 0,

            max: 100

        };

    }


    const minimum =
        Math.min(
            ...validValues
        );


    const maximum =
        Math.max(
            ...validValues
        );


    let range =
        maximum -
        minimum;


    if (
        range === 0
    ) {

        range =
            minimumPadding * 2;

    }


    const padding =
        Math.max(

            minimumPadding,

            range * 0.15

        );


    return {

        min:

            Math.floor(
                minimum -
                padding
            ),


        max:

            Math.ceil(
                maximum +
                padding
            )

    };

}


// =====================================================
// CẬP NHẬT TẤT CẢ BIỂU ĐỒ
// =====================================================

function updateCharts() {

    let filteredData =
        getFilteredData();


    if (
        filteredData.length === 0
    ) {

        return;

    }


    // Rút gọn dữ liệu nếu quá nhiều điểm

    filteredData =
        reduceChartData(
            filteredData,
            300
        );


    // =============================================
    // NHÃN THỜI GIAN
    // =============================================

    const labels =
        filteredData.map(

            function(item) {

                return formatChartTime(
                    item.time
                );

            }

        );


    // =============================================
    // CO2
    // =============================================

    const co2Data =
        filteredData.map(

            function(item) {

                return item.co2;

            }

        );


    // =============================================
    // PM2.5
    // =============================================

    const pm25Data =
        filteredData.map(

            function(item) {

                return item.pm25;

            }

        );


    // =============================================
    // SỐ NGƯỜI
    // =============================================

    const peopleData =
        filteredData.map(

            function(item) {

                return item.people;

            }

        );


    // =============================================
    // VẼ BIỂU ĐỒ
    // =============================================

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
        !canvas ||
        typeof Chart === "undefined"
    ) {

        return;

    }


    if (
        co2Chart
    ) {

        co2Chart.destroy();

    }


    const yAxis =
        calculateYAxis(
            data,
            50
        );


    co2Chart =
        new Chart(

            canvas,

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
                                        0.3,

                                    pointRadius:
                                        0

                                },


                                {

                                    label:
                                        "Ngưỡng chú ý (800 ppm)",

                                    data:

                                        labels.map(
                                            () => 800
                                        ),

                                    borderDash:
                                        [5, 5],

                                    borderWidth:
                                        1,

                                    pointRadius:
                                        0

                                },


                                {

                                    label:
                                        "Ngưỡng cảnh báo (1000 ppm)",

                                    data:

                                        labels.map(
                                            () => 1000
                                        ),

                                    borderDash:
                                        [5, 5],

                                    borderWidth:
                                        1,

                                    pointRadius:
                                        0

                                }

                            ]

                    },


                options:

                    {

                        responsive:
                            true,


                        maintainAspectRatio:
                            false,


                        interaction:

                            {

                                mode:
                                    "index",

                                intersect:
                                    false

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

                                        min:
                                            yAxis.min,

                                        max:
                                            yAxis.max,


                                        title:

                                            {

                                                display:
                                                    true,

                                                text:
                                                    "ppm"

                                            }

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
        !canvas ||
        typeof Chart === "undefined"
    ) {

        return;

    }


    if (
        pm25Chart
    ) {

        pm25Chart.destroy();

    }


    const yAxis =
        calculateYAxis(
            data,
            3
        );


    pm25Chart =
        new Chart(

            canvas,

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
                                        0.3,

                                    pointRadius:
                                        0

                                },


                                {

                                    label:
                                        "Ngưỡng cảnh báo (12 µg/m³)",

                                    data:

                                        labels.map(
                                            () => 12
                                        ),

                                    borderDash:
                                        [5, 5],

                                    borderWidth:
                                        1,

                                    pointRadius:
                                        0

                                }

                            ]

                    },


                options:

                    {

                        responsive:
                            true,


                        maintainAspectRatio:
                            false,


                        interaction:

                            {

                                mode:
                                    "index",

                                intersect:
                                    false

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

                                        min:

                                            Math.max(
                                                0,
                                                yAxis.min
                                            ),


                                        max:
                                            yAxis.max,


                                        title:

                                            {

                                                display:
                                                    true,

                                                text:
                                                    "µg/m³"

                                            }

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
        !canvas ||
        typeof Chart === "undefined"
    ) {

        return;

    }


    if (
        peopleChart
    ) {

        peopleChart.destroy();

    }


    peopleChart =
        new Chart(

            canvas,

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
                                        0

                                },


                                {

                                    label:
                                        "Ngưỡng đông người (20 người)",

                                    data:

                                        labels.map(
                                            () => 20
                                        ),

                                    borderDash:
                                        [5, 5],

                                    borderWidth:
                                        1,

                                    pointRadius:
                                        0

                                }

                            ]

                    },


                options:

                    {

                        responsive:
                            true,


                        maintainAspectRatio:
                            false,


                        interaction:

                            {

                                mode:
                                    "index",

                                intersect:
                                    false

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

                                            },


                                        title:

                                            {

                                                display:
                                                    true,

                                                text:
                                                    "Người"

                                            }

                                    }

                            }

                    }

            }

        );

}


// =====================================================
// GỬI LỆNH ĐẾN GOOGLE APPS SCRIPT
// =====================================================

async function sendCommand(
    data
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
                        data
                    )

            }

        );


    return await response.text();

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
            input.value,
            10
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

        const result =
            await sendCommand(

                {

                    action:
                        "set_people",

                    so_nguoi:
                        people

                }

            );


        console.log(
            "Phản hồi:",
            result
        );


        document.getElementById(
            "people"
        ).textContent =
            people;


        alert(
            "✅ Đã gửi lệnh cập nhật số người: " +
            people
        );


        // Tải lại dữ liệu sau khi Apps Script xử lý

        setTimeout(

            loadData,

            3000

        );

    }

    catch (error) {

        console.error(
            error
        );


        alert(
            "❌ Không thể cập nhật số người!"
        );

    }

}


// =====================================================
// ĐẶT CHẾ ĐỘ LED
// =====================================================

async function setLedMode(
    mode
) {

    currentLedMode =
        mode;


    try {

        const result =
            await sendCommand(

                {

                    action:
                        "set_led",

                    mode:
                        currentLedMode,

                    red:
                        ledState.red,

                    yellow:
                        ledState.yellow,

                    green:
                        ledState.green

                }

            );


        console.log(
            "Phản hồi LED:",
            result
        );


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
            "❌ Không thể điều khiển LED!"
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

    if (
        ![
            "red",
            "yellow",
            "green"
        ].includes(color)
    ) {

        return;

    }


    // Chuyển sang chế độ thủ công

    currentLedMode =
        "MANUAL";


    // Chỉ thay đổi LED được chọn

    ledState[color] =
        state;


    try {

        const result =
            await sendCommand(

                {

                    action:
                        "set_led",

                    mode:
                        currentLedMode,

                    red:
                        ledState.red,

                    yellow:
                        ledState.yellow,

                    green:
                        ledState.green

                }

            );


        console.log(
            "Phản hồi LED:",
            result
        );


        alert(
            "💡 Đã gửi lệnh: LED " +
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
            "❌ Không thể gửi lệnh LED!"
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

setInterval(

    loadData,

    30000

);
