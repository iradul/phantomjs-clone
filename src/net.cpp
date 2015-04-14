/***** < ivan *****/
#include <QNetworkProxy>
#include <QNetworkRequest>
#include <QNetworkReply>
#include <QDebug>

#include <stdlib.h>
#include <QList>
#include <QWebHitTestResult>
#include "terminal.h"
#include <QNetworkInterface>
#include <QFile>
#include <QRegExp>
#include <QWebPage>


#include "net.h"
#include "phantom.h"

Net::Net(QObject *parent)
    : QObject(parent)
{
    setObjectName("Net");
    m_timeout = 0;
    m_timeoutTimer.setSingleShot(true);
    connect(&m_timeoutTimer, SIGNAL(timeout()), SLOT(_timeoutTestFunction()));
    m_net = new QNetworkAccessManager();
    m_bypassProxy = true;
    m_userAgent = QString();
}

QString Net::_fetchUrl(const QString &url, const QString &method, const QVariant &op)
{
    QByteArray body;
    QNetworkRequest request;
    QVariantMap fileMapDownload, fileMapUpload;
    QString fileEncoding = "auto";
    bool 
        isFileUpload = false,
        isFileDownload = false;
    
    QNetworkProxy proxy = QNetworkProxy::applicationProxy();
    if (m_bypassProxy) { // turn off proxy
        QNetworkProxy::setApplicationProxy(QNetworkProxy::NoProxy);
    }
    qDebug() << "Net - _fetchUrl [" << url << "] as " << method << " request (file upload will use only POST (default) or PUT)";
    if (op.type() == QVariant::Map) {
        QVariantMap settingsMap = op.toMap();
        if (settingsMap.contains("upload")) {
            fileMapUpload = QVariantMap(settingsMap.value("upload").toMap());
            if (fileMapUpload.contains("file") && fileMapUpload.contains("mime")) {
                isFileUpload = true;
            }
        }
        if (settingsMap.contains("download")) {
            fileMapDownload = QVariantMap(settingsMap.value("download").toMap());
            if (fileMapDownload.contains("file")) {
                isFileDownload = true;
            }
        }
        if (settingsMap.contains("fileEncoding")) {
            fileEncoding = settingsMap.value("fileEncoding").toString().toLower();
        }

        QString bodyString = settingsMap.value("data").toString();
        QString encoding = settingsMap.value("encoding").toString().toLower();
        if (isFileUpload) {
            qDebug() << "Net - Uploading file" << fileMapUpload.value("file").toString();
            QFile file(fileMapUpload.value("file").toString());
            if (!file.open(QIODevice::ReadOnly)){
                qDebug() << "Net - QFile Error: File not found!";
                m_fetchResult.clear();
                m_fetchResult.insert("url", url);
                m_fetchResult.insert("file", fileMapUpload.value("file").toString());
                m_fetchResult.insert("error", "File not found!");
                return "";
            }
            body.append(file.readAll());
            file.close();
            request.setRawHeader(QString("Content-Type").toLatin1(),fileMapUpload.value("mime").toString().toLatin1());
            request.setRawHeader(QString("Content-Length").toLatin1(), QString::number(body.length()).toLatin1());
        }
        else {
            body = encoding == "utf-8" || encoding == "utf8" ? bodyString.toUtf8() : bodyString.toLatin1();
        }
        if (settingsMap.contains("headers")) {
            QMapIterator<QString, QVariant> i(settingsMap.value("headers").toMap());
            while (i.hasNext()) {
                i.next();
                if (!isFileUpload || i.key().toUtf8() != "Content-Type" && i.key().toUtf8() != "Content-Length") { // ignore Content-Type and Content-Length for file upload
                    request.setRawHeader(i.key().toUtf8(), i.value().toString().toUtf8());
                    qDebug() << "Net - Adding header: " << i.key().toUtf8() << ": " << i.value().toString().toUtf8();
                }
                else {
                    qDebug() << "Net - Ignore header: " << i.key().toUtf8() << ": " << i.value().toString().toUtf8();
                }
            }
        }
        
        if (request.header(QNetworkRequest::UserAgentHeader).isNull() && !m_userAgent.isEmpty()) {
            qDebug() << "Net - Using agent : " << m_userAgent;
            request.setHeader(QNetworkRequest::UserAgentHeader, m_userAgent);
        }
        request.setUrl(url);
        if (method == "POST" || (isFileUpload && method != "POST" && method != "PUT"))
            m_reply = m_net->post(request, body);
        else if (method == "PUT")
            m_reply = m_net->put(request, body);
        else if (method == "DELETE")
            m_reply = m_net->deleteResource(request);
        else if (method == "HEAD")
            m_reply = m_net->head(request);
        else
            m_reply = m_net->get(request);
    }
    else
    {
        if (method == "DELETE")
            m_reply = m_net->deleteResource(QNetworkRequest(QUrl(url)));
        else
            m_reply = m_net->get(QNetworkRequest(QUrl(url)));
    }
    
    if (Phantom::instance()->config()->ignoreSslErrors()) {
        qDebug() << "Net - ignoreSslErrors";
        //connect(m_reply, SIGNAL(sslErrors(const QList<QSslError> &)), m_reply, SLOT(ignoreSslErrors()));
        m_reply->ignoreSslErrors();
    }

    // run timeout
    if (m_timeout > 0) {
        m_timeoutTimer.setInterval(m_timeout);
        m_timeoutTimer.start();
        qDebug() << "Net - fetch timeout is " << m_timeout;
    }

    if (isFileDownload) {
        qDebug() << "Net - downloading to :" << fileMapDownload.value("file");
        connect(m_reply, SIGNAL(finished()), &m_loop, SLOT(quit()));
        connect(m_reply, SIGNAL(readyRead()), &m_loop, SLOT(quit()));
        QFile file(fileMapDownload.value("file").toString());
        file.open(QIODevice::WriteOnly);
        while (true) {
            bool finished = m_reply->isFinished();
            //not working: m_reply->waitForReadyRead((m_timeout > 0) ? m_timeout : -1);
            if (!finished) m_loop.exec();
            QByteArray da = m_reply->readAll();
            qDebug() << "Net - size read " << da.size();
            if (da.size() == 0) {
                break;
            }
            file.write(da);
            if (finished) break;
        }
        file.close();
        disconnect(m_reply, SIGNAL(finished()), &m_loop, SLOT(quit()));
        disconnect(m_reply, SIGNAL(readyRead()), &m_loop, SLOT(quit()));
        qDebug() << "Net - done downloading";
    }
    else {
        //QTimer::singleShot(m_globalTimeout, this, SLOT(_globalTimeoutTestFunction()));
        connect(m_reply, SIGNAL(finished()), &m_loop, SLOT(quit()));
        m_loop.exec();
        disconnect(m_reply, SIGNAL(finished()), &m_loop, SLOT(quit()));
        m_timeoutTimer.stop();
    }
    if (m_bypassProxy) { // restore proxy
        QNetworkProxy::setApplicationProxy(proxy);
    }

    m_fetchResult.clear();
    QString originalUrl = m_reply->request().url().toString();
    m_fetchResult.insert("url", originalUrl);
    QString actualUrl = m_reply->attribute(QNetworkRequest::RedirectionTargetAttribute).toUrl().toString();
    if (actualUrl == "") {
        m_fetchResult.insert("actualUrl", originalUrl);
    }
    else {
        m_fetchResult.insert("actualUrl", resolveUrl(originalUrl, actualUrl));
    }
    m_fetchResult.insert("statusMessage", QString::fromUtf8(m_reply->attribute(QNetworkRequest::HttpReasonPhraseAttribute).toByteArray()));
    m_fetchResult.insert("status", m_reply->attribute(QNetworkRequest::HttpStatusCodeAttribute).toInt());
    switch (m_reply->error())
    {
        case QNetworkReply::NoError:
            m_fetchResult.insert("error", 0);
            break;
        case QNetworkReply::ConnectionRefusedError:
            m_fetchResult.insert("errorMessage", "ConnectionRefusedError");
            m_fetchResult.insert("error", 1);
            break;
        case QNetworkReply::RemoteHostClosedError:
            m_fetchResult.insert("errorMessage", "RemoteHostClosedError");
            m_fetchResult.insert("error", 2);
            break;
        case QNetworkReply::HostNotFoundError:
            m_fetchResult.insert("errorMessage", "HostNotFoundError");
            m_fetchResult.insert("error", 3);
            break;
        case QNetworkReply::TimeoutError:
            m_fetchResult.insert("errorMessage", "TimeoutError");
            m_fetchResult.insert("error", 4);
            break;
        case QNetworkReply::OperationCanceledError:
            m_fetchResult.insert("errorMessage", "OperationCanceledError");
            m_fetchResult.insert("error", 5);
            break;
        case QNetworkReply::SslHandshakeFailedError:
            m_fetchResult.insert("errorMessage", "SslHandshakeFailedError");
            m_fetchResult.insert("error", 6);
            break;
        case QNetworkReply::TemporaryNetworkFailureError:
            m_fetchResult.insert("errorMessage", "TemporaryNetworkFailureError");
            m_fetchResult.insert("error", 7);
            break;
        /*case QNetworkReply::NetworkSessionFailedError:
            m_fetchResult.insert("errorMessage", "NetworkSessionFailedError");
            m_fetchResult.insert("error", 8);
            break;
        case QNetworkReply::BackgroundRequestNotAllowedError:
            m_fetchResult.insert("errorMessage", "BackgroundRequestNotAllowedError");
            m_fetchResult.insert("error", 9);
            break;*/
        case QNetworkReply::ProxyConnectionRefusedError:
            m_fetchResult.insert("errorMessage", "ProxyConnectionRefusedError");
            m_fetchResult.insert("error", 101);
            break;
        case QNetworkReply::ProxyConnectionClosedError:
            m_fetchResult.insert("errorMessage", "ProxyConnectionClosedError");
            m_fetchResult.insert("error", 102);
            break;
        case QNetworkReply::ProxyNotFoundError:
            m_fetchResult.insert("errorMessage", "ProxyNotFoundError");
            m_fetchResult.insert("error", 103);
            break;
        case QNetworkReply::ProxyTimeoutError:
            m_fetchResult.insert("errorMessage", "ProxyTimeoutError");
            m_fetchResult.insert("error", 104);
            break;
        case QNetworkReply::ProxyAuthenticationRequiredError:
            m_fetchResult.insert("errorMessage", "ProxyAuthenticationRequiredError");
            m_fetchResult.insert("error", 105);
            break;
        case QNetworkReply::ContentAccessDenied:
            m_fetchResult.insert("errorMessage", "ContentAccessDenied");
            m_fetchResult.insert("error", 201);
            break;
        case QNetworkReply::ContentOperationNotPermittedError:
            m_fetchResult.insert("errorMessage", "ContentOperationNotPermittedError");
            m_fetchResult.insert("error", 202);
            break;
        case QNetworkReply::ContentNotFoundError:
            m_fetchResult.insert("errorMessage", "ContentNotFoundError");
            m_fetchResult.insert("error", 203);
            break;
        case QNetworkReply::AuthenticationRequiredError:
            m_fetchResult.insert("errorMessage", "AuthenticationRequiredError");
            m_fetchResult.insert("error", 204);
            break;
        case QNetworkReply::ContentReSendError:
            m_fetchResult.insert("errorMessage", "ContentReSendError");
            m_fetchResult.insert("error", 205);
            break;
        case QNetworkReply::ProtocolUnknownError:
            m_fetchResult.insert("errorMessage", "ProtocolUnknownError");
            m_fetchResult.insert("error", 301);
            break;
        case QNetworkReply::ProtocolInvalidOperationError:
            m_fetchResult.insert("errorMessage", "ProtocolInvalidOperationError");
            m_fetchResult.insert("error", 302);
            break;
        case QNetworkReply::UnknownNetworkError:
            m_fetchResult.insert("errorMessage", "UnknownNetworkError");
            m_fetchResult.insert("error", 99);
            break;
        case QNetworkReply::UnknownProxyError:
            m_fetchResult.insert("errorMessage", "UnknownProxyError");
            m_fetchResult.insert("error", 199);
            break;
        case QNetworkReply::UnknownContentError:
            m_fetchResult.insert("errorMessage", "UnknownContentError");
            m_fetchResult.insert("error", 299);
            break;
        case QNetworkReply::ProtocolFailure:
            m_fetchResult.insert("errorMessage", "ProtocolFailure");
            m_fetchResult.insert("error", 399);
            break;
        default:
            m_fetchResult.insert("errorMessage", "Unknown");
            m_fetchResult.insert("error", 999);
            break;
    }

    if (isFileDownload) {
        m_fetchResult.insert("size", m_reply->header(QNetworkRequest::ContentLengthHeader).toLongLong());
        delete m_reply;
        return QString("ok");
    }
    QByteArray dataByteArray = m_reply->readAll();
    m_fetchResult.insert("size", 
        (m_reply->header(QNetworkRequest::ContentLengthHeader).isValid())
        ? m_reply->header(QNetworkRequest::ContentLengthHeader).toLongLong()
        : dataByteArray.size()
        );
    QTextCodec *codec = 0;
    qDebug() << "Net - fileEncoding :" << fileEncoding;
    if (fileEncoding != "auto") { // detect encoding
        codec = QTextCodec::codecForName(fileEncoding.toLatin1());
    }
    if (codec == 0) { // detect encoding
        qDebug() << "Net - encoding will be autodetected";
        // BOM
        codec = QTextCodec::codecForUtfText(dataByteArray, 0);
        // HTTP Content-Type HEADER
        if (!codec) {
            qDebug() << "Net - encoding not detected by BOM";
            if (m_reply->header(QNetworkRequest::ContentTypeHeader).isValid()) {
                // get contentType header
                QString contentType = m_reply->header(QNetworkRequest::ContentTypeHeader).toString();
                qDebug() << "Net - Content-Type :" << contentType;

                // search for [charset=?] in it
                QRegExp rxCharset("charset=(.*)", Qt::CaseInsensitive);
                if (rxCharset.indexIn(contentType) > -1) {
                    // try to get codec by name, if it fails 0 will be returned
                    qDebug() << "Net - Content-Type charset :" << rxCharset.cap(1);
                    codec = QTextCodec::codecForName(rxCharset.cap(1).toLatin1());
                }
                else {
                    qDebug() << "Net - Content-Type doesn't contain [charset]";
                }
            }
            else {
                qDebug() << "Net - Content-Type header is missing";
            }
        }
        // META
        // THIS IS MODIFIED QTextCodec::codecForHtml FUNCTION
        // c:\phantomjs\src\qt\qtbase\src\corelib\codecs\qtextcodec.cpp
        if (!codec) {
            qDebug() << "Net - encoding not detected by Content-Type";
            // test on first 4096 - originaly it was 512
            QByteArray sample = dataByteArray.left(4096).toLower();
            int pos = sample.indexOf("meta ");
            if (pos != -1) {
                pos = sample.indexOf("charset=", pos);
                if (pos != -1) {
                    pos += qstrlen("charset=");

                    int pos2 = pos;
                    // The attribute can be closed with either """, "'", ">" or "/",
                    // none of which are valid charset characters.
                    while (++pos2 < sample.size()) {
                        char ch = sample.at(pos2);
                        if (ch == '\"' || ch == '\'' || ch == '>') {
                            qDebug() << "Net - meta tag encoding: " << sample.mid(pos, pos2 - pos);
                            codec = QTextCodec::codecForName(sample.mid(pos, pos2 - pos));
                            break;
                        }
                    }
                }
            }
        }
        // DEFAULT UTF-8
        if (!codec) {
        qDebug() << "Net - codec is unknown - UTF-8 will be used";
            codec = QTextCodec::codecForName("utf-8");
        }
        //codec = QTextCodec::codecForHtml(dataByteArray, codec);
    }
    qDebug() << "Net - final encoding :" << QString::fromUtf8(codec->name());

    delete m_reply;
        
    return codec->toUnicode(dataByteArray);
}

QVariantMap Net::fetchResult() const
{
    return m_fetchResult;
}

void Net::_setFetchResult(const QVariantMap &result)
{
    m_fetchResult = result;
}

bool Net::bypassProxy() const
{
    return m_bypassProxy;
}

void Net::setBypassProxy(bool value)
{
    m_bypassProxy = value;
}

QString Net::userAgent() const
{
    return m_userAgent;
}

void Net::setUserAgent(const QString &agent)
{
    m_userAgent = agent;
}

bool Net::echo(const QString &host, int port, const QString &message)
{
  QTcpSocket socket;
  qDebug() << "Net - Echoing host " << host << ":" << port;
  socket.connectToHost( host, port );
  if (socket.waitForConnected( 8000 )) { // 8sec timeout
    bool ok = true;
    while (socket.state() == QAbstractSocket::ConnectedState) {
        if (message.length() > 0) {
            socket.write( message.toUtf8() );
            ok = socket.waitForBytesWritten();
        }
        break;
    } // while
    qDebug() << "Net - echo status: " << ok;
    socket.close();
    return ok;
  }
  else {
    qDebug() << "Net - timeout..." << socket.state();
    return false;
  }
}

QString Net::resolveUrl(const QString &base, const QString &relative) const
{
    QUrl baseUrl(base);
    QUrl relativeUrl(relative);
    return baseUrl.resolved(relativeUrl).toString();
}

QString Net::localIP() const
{
    foreach (const QHostAddress &address, QNetworkInterface::allAddresses()) {
    if (address.protocol() == QAbstractSocket::IPv4Protocol
        && address != QHostAddress(QHostAddress::LocalHost)
        && address.toString().section( ".",-1,-1 ) != "1")
         return address.toString();
    }
    return "";
}

int Net::timeout() const
{
    return m_timeout;
}

void Net::setTimeout(int timeout)
{
    m_timeout = timeout;
}

void Net::_timeoutTestFunction()
{
    qDebug("fetch timeout! abort");
    m_reply->abort();
    m_loop.quit();
}
/***** ivan > *****/