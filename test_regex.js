let q1 = "WHERE TrangThai = 'Đang hoạt động' AND x = 'abc'";
let q2 = q1.replace(/(^|[^N])'([^']*[^\x00-\x7F][^']*)'/g, "$1N'$2'");
console.log('Original:', q1);
console.log('Result:', q2);

